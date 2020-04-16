require('dotenv').config();
const user = require("./services/user");

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.json());

app.get('/', function (req, res) {
  res.json({ message: 'hello world' });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});

const TelegramBot = require("node-telegram-bot-api");
const token = process.env.TOKEN;
const bot = new TelegramBot(token);
bot.setWebHook(process.env.HOST + bot.token);

app.post('/' + bot.token, function (req, res) {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

const midtransClient = require("midtrans-client");
// Create Snap API instance
let snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.SERVERKEY,
  clientKey: process.env.CLIENTKEY
});
// Create Core API instance
let core = new midtransClient.CoreApi({
  isProduction : false,
  serverKey : process.env.SERVERKEY,
  clientKey : process.env.CLIENTKEY
});

app.post('/notification_handler', function(req, res){
  let receivedJson = req.body;
  core.transaction.notification(receivedJson)
    .then((transactionStatusObject)=>{
      let orderId = transactionStatusObject.order_id;
      let transactionStatus = transactionStatusObject.transaction_status;
      let fraudStatus = transactionStatusObject.fraud_status;

      let summary = `Transaction notification received. Order ID: ${orderId}. Transaction status: ${transactionStatus}. Fraud status: ${fraudStatus}.<br>Raw notification object:<pre>${JSON.stringify(transactionStatusObject, null, 2)}</pre>`;

      // [5.B] Handle transaction status on your backend via notification alternatively
      // Sample transactionStatus handling logic
      if (transactionStatus == 'capture'){
          if (fraudStatus == 'challenge'){
              // TODO set transaction status on your databaase to 'challenge'
              const data = {
                data: {
                  attributes: {
                    status: 'sending',
                  }
                }
              };
              user.updateOrder(orderId, data)
                .then(response => {
                  console.log('data: ', response.data)
                  user.getOrderById(orderId)
                    .then(order => {
                      bot.sendMessage(order.data.data.user_id, `Transaksi anda dalam status 'challenge'. Harap menunggu.`, {
                        parse_mode: "Markdown"
                      })
                    })
                    .catch(err => {
                      console.log(err.response);
                    });
                })
                .catch(err => {
                  console.log(err.response);
                });
          } else if (fraudStatus == 'accept'){
              // TODO set transaction status on your databaase to 'success'
              const data = {
                data: {
                  attributes: {
                    status: 'done',
                  }
                }
              };
              user.updateOrder(orderId, data)
                .then(response => {
                  console.log('data: ', response.data)
                  user.getOrderById(orderId)
                    .then(order => {
                      bot.sendMessage(order.data.data.user_id, `Transaksi anda sukses. Terima kasih untuk berbelanja di Ecommerce`, {
                        parse_mode: "Markdown"
                      })
                    })
                    .catch(err => {
                      console.log(err.response);
                    });
                })
                .catch(err => {
                  console.log(err.response);
                });
          }
      } else if (transactionStatus == 'settlement'){
        // TODO set transaction status on your databaase to 'success'
        // Note: Non-card transaction will become 'settlement' on payment success
        // Card transaction will also become 'settlement' D+1, which you can ignore
        // because most of the time 'capture' is enough to be considered as success
        const data = {
          data: {
            attributes: {
              status: 'done',
            }
          }
        };
        user.updateOrder(orderId, data)
          .then(response => {
            console.log('data: ', response.data)
            user.getOrderById(orderId)
              .then(order => {
                bot.sendMessage(order.data.data.user_id, `Transaksi anda sukses. Terima kasih untuk berbelanja di shoppa`, {
                  parse_mode: "Markdown"
                })
              })
              .catch(err => {
                console.log(err.response);
              });
          })
          .catch(err => {
            console.log(err.response);
          });
      } else if (transactionStatus == 'cancel' ||
        transactionStatus == 'deny' ||
        transactionStatus == 'expire'){
          // TODO set transaction status on your databaase to 'failure'
          const data = {
            data: {
              attributes: {
                status: 'failure',
              }
            }
          };
          user.updateOrder(orderId, data)
            .then(response => {
              console.log('data: ', response.data)
              user.getOrderById(orderId)
              .then(order => {
                bot.sendMessage(order.data.data.user_id, `Maaf, transaksi anda gagal. Silahkan berbelanja kembali.`, {
                  parse_mode: "Markdown"
                })
              })
              .catch(err => {
                console.log(err.response);
              });
            })
            .catch(err => {
              console.log(err.response);
            });
      } else if (transactionStatus == 'pending'){
        // TODO set transaction status on your databaase to 'pending' / waiting payment
        const data = {
          data: {
            attributes: {
              status: 'sending',
            }
          }
        };
        user.updateOrder(orderId, data)
          .then(response => {
            console.log('data: ', response.data)
            user.getOrderById(orderId)
              .then(order => {
                bot.sendMessage(order.data.data.user_id, `Transaksi anda dalam status 'pending'. Harap menunggu.`, {
                  parse_mode: "Markdown"
                })
              })
              .catch(err => {
                console.log(err.response);
              });
          })
          .catch(err => {
            console.log(err.response);
          });
      } else if (transactionStatus == 'refund'){
        // TODO set transaction status on your databaase to 'refund'
        const data = {
          data: {
            attributes: {
              status: 'failure',
            }
          }
        };
        user.updateOrder(orderId, data)
          .then(response => {
            console.log('data: ', response.data)
            user.getOrderById(orderId)
              .then(order => {
                bot.sendMessage(order.data.data.user_id, `Transaksi anda dalam status 'refund'. Silahkan berbelanja kembali.`, {
                  parse_mode: "Markdown"
                })
              })
              .catch(err => {
                console.log(err.response);
              });
          })
          .catch(err => {
            console.log(err.response);
          });
      }
      console.log(summary);
      res.send(summary);
    });
})

bot.onText(/\/start|\hi/, msg => {
  console.log(msg);
  user.findUser(msg.chat.id)
    .then(response => {
      const name = msg.from.first_name;
      if (!response.data.data) {
        bot.sendMessage(msg.chat.id, `Hello *${name}*, selamat datang di *shoppa*. Saya *Ecommercebot*, siap melayani permintaan anda.`, {
          parse_mode: "Markdown"
        }).then(() => {
          bot.sendMessage(msg.chat.id, "Untuk memudahkan transaksi, ijinkan saya mencatat nama lengkap, alamat dan nomor telepon anda.").then(() => {
            bot.sendMessage(msg.chat.id, `Kirimkan data anda melalui command */d* dengan format berikut:\n*NoTelepon*-*NamaLengkap*-*Alamat*\n\nContoh:\n*/d* *08123123123*-*John Doe*-*Bandung*`, {
              parse_mode: "Markdown"
            });
          })
        })
      }
      else {
        bot.sendMessage(msg.chat.id, `Hello *${name}*, apa kabar? Silahkan browsing produk-produk kami dengan command */product*.`, {
          parse_mode: "Markdown"
        })
      }
    })
});

bot.onText(/^\/d (.+)$/, (msg, match) => {
	console.log('msg = ', msg);
  const [phone, full_name, address] = match[1].split("-");
  console.log('address = ', address);
  const id = msg.chat.id;
  const name = msg.from.first_name;

  user.addUser(full_name, name, phone, id, address)
    .then(() => {
      bot.sendMessage(
        msg.chat.id,
        `Selamat *${name}*, data anda telah tersimpan. Silahkan browsing produk-produk kami dengan menggunakan command */product*.`,
        { parse_mode: "Markdown" }
      );
    })
    .catch(err => {
       if (err.response.data.message == 'Validation error') {
        bot.sendMessage(
          msg.chat.id,
          `*${name}*, data anda sudah tersimpan dalam database kami. Silahkan langsung browsing produk-produk kami.`,
          { parse_mode: "Markdown" }
        );
       }
      console.log(err.response.data);
    });
});

bot.onText(/\/me/, msg => {
  user.findUser(msg.chat.id)
    .then(response => {
        const item = response.data.data;
        console.log(item);
        bot.sendMessage(
          msg.chat.id,
          `Nama: ${item.username}\nNama Lengkap: ${item.full_name}\nAlamat: ${item.address}\nNo. Telepon: ${item.phone_number}`,
          { parse_mode: "Markdown" }
        );
    })
    .catch(err => {
      console.log(err.message);
    });
  user.getOrder(msg.chat.id)
    .then(response => {
      console.log('data: ', response.data.data)
    })
    .catch(err => {
      console.log(err.response);
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
	
	user.getProducts()
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
		*Nama*: ${e.name}\n*Harga*: ${e.price}
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
  const opts1 = {
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
  const opts2 = {
    chat_id: msg.chat.id,
    message_id: msg.message_id,
  };

  let text;
	
	user.getProduct(action.id)
		.then(response => {
			console.log(msg);
			if (action.action == 'desc') {
				text = msg.text + '\n' + response.data.data.description;
				bot.editMessageText(text, opts1);
			}
			else {
        user.getOrder(msg.chat.id)
          .then(response => {
            console.log('data1: ', response.data.data[0])
            if (!response.data.data.length) {
              const data = {
                data: {
                  attributes: {
                    user_id: msg.chat.id,
                    status: 'accepted',
                    order_detail: [
                      {
                        product_id: action.id,
                        quantity: 1
                      }
                    ]
                  }
                }
              };
              user.createOrder(data)
                .then(response => {
                  console.log('data2 = ', response.data.data);
                  text = "Product berhasil ditambahkan ke cart";
                  bot.editMessageText(text, opts2);
                })
                .catch(err => {
                  console.log(err.response);
                });
            }
            else {
              let cart = response.data.data[0].order_detail;
              let i = cart.findIndex(item => item.Product.id == action.id);
              if (i != -1) {
                const data = {
                  data: {
                    attributes: {
                      quantity: cart[i].quantity + 1
                    }
                  }
                };
                user.updateOrderItem(cart[i].id, data)
                  .then(response => {
                    console.log('data2 = ', response.data);
                    text = "Product berhasil ditambahkan ke cart";
                    bot.editMessageText(text, opts2);
                  })
                  .catch(err => {
                    console.log(err.response);
                  });
              }
              else {
                const data = {
                  data: {
                    attributes: {
                      product_id: action.id,
                      quantity: 1
                    }
                  }
                };
                user.addOrderItem(response.data.data[0].id, data)
                  .then(response => {
                    console.log('data2 = ', response.data);
                    text = "Product berhasil ditambahkan ke cart";
                    bot.editMessageText(text, opts2);
                  })
                  .catch(err => {
                    console.log(err.response);
                  });
              }
            }
          })
          .catch(err => {
            console.log(err.response);
          });
				
			}
		})
		.catch(err => {
			console.log(err.message);
		});
  //console.log(action)
});

bot.onText(/\/checkcart/, msg => {
	user.getOrder(msg.chat.id)
    .then(response => {
      if (response.data.data.length) {
        const cart = response.data.data[0].order_detail;
        let total = 0;
        for (let i = 0; i < cart.length; i++) {
          total += cart[i].quantity * cart[i].Product.price
        }
        let text = '';
        cart.forEach(item =>{
          text += `*Name:* ${item.Product.name}\n*Price:* ${item.Product.price}\n*Qtty:* ${item.quantity}\n`
        });
        text += `*TOTAL:* ${total}`;
        bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
      }
      else {
        bot.sendMessage(msg.chat.id, `Cart anda kosong, silahkan belanja.`, { parse_mode: "Markdown" });
      }
    })
    .catch(err => {
			console.log(err.message);
		});
});


bot.onText(/\/checkout/, msg => {
  user.getOrder(msg.chat.id)
    .then(async response => {
      const cart = response.data.data[0].order_detail;
      const orderId = response.data.data[0].id;
      let total = 0;
      for (let i = 0; i < cart.length; i++) {
        total += cart[i].quantity * cart[i].Product.price
      }

      let parameter = {
        transaction_details: {
          order_id: orderId,
          gross_amount: total
        },
        credit_card: {
          secure: true
        }
      };
    
      const transaction = await snap.createTransaction(parameter);
      bot.sendMessage(msg.chat.id, transaction.redirect_url);
    });
  
});
