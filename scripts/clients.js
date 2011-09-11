/*
 * Game clients
 */

var clients = [
  {
    id: 1,
    name: "Bus 1"
  },
  {
    id: 2,
    name: "Bus 2"
  }
];

var gameClients = {
  get : function () {
    return clients;
  }
}

exports.get = gameClients.get;