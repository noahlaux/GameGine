  now.start = function() {
    console.log('start');
  }

  now.createOpponents = function () {
    console.log(now.playerCount);
  }

  now.createPlayer = function(id) {
    this.id = id;
    console.log('create player ' + id);
    $('body').append('<div class="dot" id="player_' + id + '">PLAYER ' + id + '</div>');
    connectPlayer(id);
  }
  
  function connectPlayer(id) {
    var dot = $("#player_" + id);

    var body = $("body");

    // On mouse-down, turn on draggability.
    dot.mousedown(function(event) {
      // Prevent the default behavior.
      event.preventDefault();

      // Get the current position of the mouse within the
      // bounds of the target.
      var localOffset = {
        x : (event.pageX - dot.position().left),
        y : (event.pageY - dot.position().top)
      };

      // Start tracking the mouse movement on the body.
      // We're tracking on the body so that the mouse can
      // move faster than the tracking.
      body.mousemove(function(event) {

        // Create a new position object.
        var newPosition = {
          left : (event.pageX - localOffset.x),
          top : (event.pageY - localOffset.y)
        };

        // Update the target position locally.
        dot.css(newPosition);

        // Announce the updated position so that we
        // can sync accross all clients with NowJS.
        now.syncPosition(newPosition);
      });
    });
    // On mouse-up, turn off draggability.
    dot.mouseup(function(event) {
      // Unbind the mousemove - no need to track movement
      // once the mouse has been lifted.
      body.unbind("mousemove");
    });
    // I allow the remove server to make a request to update the
    // position of the target.
    //
    // NOTE: By defining this function in the NOW scope, it gives
    // the server access to it as well.
    now.updatePosition = function(id, newPosition) {
      // Check to see if this client is in master mode; if so,
      // we won't update the position as this client is
      // actively updating its own position.
      dot.css(newPosition);
    }

    now.logger = function(msg) {
      console.log(msg);
    }
  }
