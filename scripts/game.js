/**
 * GAMEGINE
 * @namespace GAMEGINE
 * @class game
 */

var GAMEGINE = window.GAMEGINE || {};

GAMEGINE.game = {
  _init : function() {
    // TODO implement
  },
  /**
   * Creates a new game
   * @param {Objects} options
   * @return {Integer} New game id
   */
  create : function(options) {

    var options = {
      name : 'default',
      type : 1
    };

    // TODO implement
    var id = 1;
    return id;
  },
  /**
   * Remove game
   * @param {Integer} id Game id
   * @return {Boolean} success
   */
  remove : function(id) {
    // TODO implement
    var result = true;

    return result;
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