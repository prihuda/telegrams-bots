const axios = require("axios");
const API_URL = process.env.API_URL;
const Customer = 'api/v1/customer/';
const Product = 'api/v1/product/';
const Order = 'api/v1/order/';
const OrderItem = 'api/v1/orderitem/';

exports.addUser = (full_name, name, phone, id, address) => {
  return axios.post(API_URL + Customer, {
    data: {
      attributes: {
        id: id,
        full_name: full_name,
        phone_number: phone,
        username: name,
        address: address
      }
    }
  })
}

exports.findUser = (id) => {
  return axios.get(API_URL + Customer + id);
}

exports.getOrder = (id) => {
  return axios.get(API_URL + Customer + id + '/orders');
}

exports.getOrderById = (id) => {
  return axios.get(API_URL + Order + id);
}

exports.getProducts = () => {
  return axios.get(API_URL + Product);
}

exports.getProduct = (id) => {
  return axios.get(API_URL + Product + id);
}

exports.createOrder = (data) => {
  return axios.post(API_URL + Order, data);
}

exports.addOrderItem = (id, data) => {
  return axios.post(API_URL + Order + id, data);
}

exports.updateOrderItem = (id, data) => {
  return axios.put(API_URL + OrderItem + id, data);
}

exports.updateOrder = (id, data) => {
  return axios.put(API_URL + Order + id, data);
}