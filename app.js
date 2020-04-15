require('dotenv').config();
const TelegramBot = require("node-telegram-bot-api");
const token = process.env.TOKEN;
const bot = new TelegramBot(token, { polling: true });
const midtransClient = require("midtrans-client");
const axios = require("axios");
const API_URL = process.env.API_URL;
const Customer = 'api/v1/customer/';
const Product = 'api/v1/product/';

let cart = {};

// Create Snap API instance
let snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.SERVERKEY,
  clientKey: process.env.CLIENTKEY
});

bot.onText(/\/start|\hi/, msg => {
  bot.sendMessage(msg.chat.id, "hi ada yang bisa saya bantu");
  bot.sendMessage(msg.chat.id, "kirimkan data anda dengan format berikut:");
  bot.sendMessage(msg.chat.id, `*No Telepon*-*Nama*-*Alamat*`, {
    parse_mode: "Markdown"
  });

  bot.sendMessage(msg.chat.id, `*08123123123*-*John*-*Bandung*`);
});

bot.onText(/\d/, msg => {
  const {
    text,
    from: { id }
  } = msg
	console.log('username = ', id);
	console.log('msg = ', msg);
  const [phone, name, address] = text.split(" ")[1].split("-");

  const addUser = () =>
		axios
      .post(API_URL + Customer, {
        data: {
          attributes: {
						full_name: name,
            phone_number: phone,
						username: id,
            email: address
          }
        }
      })
			.then(response => {
        bot.sendMessage(
					msg.chat.id,
					`Selamat *${name}*, data anda telah tersimpan. Silahkan lakukan order.`,
					{ parse_mode: "Markdown" }
				);
      })
			.catch(err => {
				console.log(err.message);
			});

	axios.get(API_URL + Customer + id)
		.then(response => {
			if (!response.data.data) {
				addUser();
			}
			else {
				bot.sendMessage(
					msg.chat.id,
					`*${name}*, data anda sudah tersimpan. Silahkan lakukan order.`,
					{ parse_mode: "Markdown" }
				);
			}
		})
		.catch(err => {
			console.log(err.message);
		});
});

bot.onText(/\/me/, msg => {
  const {
    from: { id }
  } = msg;
	axios.get(API_URL + Customer + id)
		.then(response => {
			console.log(response.data.data);
			bot.sendMessage(msg.chat.id, JSON.stringify(response.data.data, null, 2));
		})
		.catch(err => {
			console.log(err.message);
		});
});

bot.onText(/\/product/, msg => {
  let inline_keyboard = (e) => [
    [
      {
        text: "Add to Cart",
        callback_data: JSON.stringify(e.cart)
      },
      {
        text: "Detail",
        callback_data: JSON.stringify(e.detail)
      }
    ]
  ];
	
	axios.get(API_URL + Product)
		.then(response => {
			const data = response.data.data;
			console.log(response.data.data);
			
			data.forEach(e => {
				let x = {
					cart: {
						id: e.id,
						action: 'cart'
					},
					detail: {
						id: e.id,
						action: 'desc'
					}
				};
				
				bot.sendMessage(
					msg.chat.id,
					`
		*Nama*: ${e.name}
		*Harga*: ${e.price}
		`,
					{
						reply_markup: {
							inline_keyboard: inline_keyboard(x)
						},
						parse_mode: "Markdown"
					}
				);
			});
		})
		.catch(err => {
			console.log(err.message);
		});
});



bot.on("callback_query", function onCallbackQuery(callbackQuery) {
  const action = JSON.parse(callbackQuery.data);
  const msg = callbackQuery.message;
	let x = {
					cart: {
						id: action.id,
						action: 'cart'
					}
	};
  const opts = {
    chat_id: msg.chat.id,
    message_id: msg.message_id,
		reply_markup: {
			inline_keyboard: [[
				{
					text: "Add to Cart",
					callback_data: JSON.stringify(x.cart)
				}
			]]
		}
  };
  let text;
	
	axios.get(API_URL + Product + action.id)
		.then(response => {
			console.log(msg);
			if (action.action == 'desc') {
				text = msg.text + '\n' + response.data.data.description;
			}
			else {
				
			}
			bot.editMessageText(text, opts);
			//bot.sendMessage(msg.chat.id, JSON.stringify(response.data.data, null, 2));
		})
		.catch(err => {
			console.log(err.message);
		});

  console.log(action)
	
  /* if (data.find(item => item.data.name === action.name)) {
    text = "Product berhasil ditambahkan ke cart";
  }

  bot.editMessageText(text, opts); */
});


bot.onText(/\/checkout/, async msg => {
  let parameter = {
    transaction_details: {
      order_id: `test-transaction-${Date.now()}`,
      gross_amount: 200000
    },
    credit_card: {
      secure: true
    }
  };

  const transaction = await snap.createTransaction(parameter);
  bot.sendMessage(msg.chat.id, transaction.redirect_url);
});
