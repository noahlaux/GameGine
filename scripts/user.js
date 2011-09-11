/**
 * GAMEGINE
 * @namespace GAMEGINE
 * @class user
 */

var user = {
  _init : function() {
    // TODO implement
  },
  /**
   * Creates a new user
   * @param {Objects} options
   * @return {Integer} New game id
   */
  create : function(options) {

    var options = {
      name : 'John Doe',
      password : 'default',
      gender : 1,
      type : 1
    };

    // TODO implement
    var id = 1;
    return id;
  },
  /**
   * Remove game
   * @param {Integer} id user id
   * @return {Boolean} success
   */
  remove : function(id) {
    // TODO implement
    var result = true;

    return result;
  },
  /**
   * Return a user
   * @param {Integer} id User id
   * @return {Object} User object
   */
  get : function(id) {

    var users = [{
      "id" : 1,
      "username" : "noahlaux"
    }, {
      "id" : 2,
      "username" : "dennis"
    }];
    console.log(users)

    return users[0];
  },
  /**
   * Return a list of available games
   * @return {Object}
   */
  getList : function() {
    // TODO impliment
    return;
  }
};

exports.get = user.get();
