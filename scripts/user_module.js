  var users = [{
      "id" : 1,
      "username" : "noahlaux"
    },{
      "id" : 2,
      "username" : "dennis"
    }],
    online = [];

  exports.get = function(id) {
    return users;
  }

  exports.login = function(id) {
    
    if(!isOnline(id)) {
      online.push(id);   
      userState(id, true);   
      console.log(online)  
    } else {
      console.log("user already logged in");
    }
    
  }
    
  exports.logoff = function(id) {
    
    if(isOnline(id)) {
      
      for (onlineId in online) {
        if (online[onlineId] == id) {
          online[onlineId] = false;
          break;
        }
      }
       userState(id, false);
    } else {
      console.log("user already logged off");
    }
    
  }
  
  function isOnline(id) {
    var state = false;
    
    for (li in online) {
      if (online[li] == id) {
        state = true;
        break;
      }  
    }
    console.log('User ' + id + ' online:' + state);
    return state;
  }

  function userState(id, state) {
  
    var foundit = false;
  
    for(user in users) {
      if(users[user].id == id) {
  
        users[user].online = state;
        return true;
      }
    }
  }

  exports.online = function () {
    return online;
  }
  
  exports.disconnectAll = function () {
    console.log("Disconnect All");
    
    for (user in users) {
      userState(users[user].id,false);  
    }
    
    online = [{}];
    return true;
  }  