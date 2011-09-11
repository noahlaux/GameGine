// Master connection to socket server
socket = io.connect();

socket.on('connect', function() {
  console.log("Connected to socket server");
  socket.emit("get users");
  socket.emit('get clients');
});

/* 
socket.on('update users', function(data) {
  console.log(data)
  $('#users').html('data');
});
*/
socket.on('session', function(data) {
  console.log("SESSION");
  console.log(data);
  
  $('#session').html('');
  
  $.each(data.sessions, function(i, client) {
    $('#session').append('<li>' + client[i] + ' ' + client + '</li>');
  });
  
});

socket.on('clients', function(data) {
  $('#clients').html('');
  
  $.each(data, function(i, client) {
    $('#clients').append('<li class="offline">' + client.name + '</li>');
  });
  
});

socket.on('users', function(data) {
  console.log(data)
  
  console.log('getting users');
  
  // Clear box
  $('#users').html('');

  $.each(data, function(i,user) {
    
    user = $.parseJSON(user).user;

      var a = document.createElement('a');
      a.href='javascript:socket.emit("logoff", ' + user.id + ')';
      a.innerText = 'logoff';
      var li = document.createElement('li');
      li.className = "online";
      li.innerText = user.username + ' ';
      li.appendChild(a);

      $('#users').append(li);
  });

});
