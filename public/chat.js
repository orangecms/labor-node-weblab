window.onload = function() {
 
    var messages = [];
    var socket = io.connect('http://localhost:3700');
    var field = document.getElementById("field");
    //var sendButton = document.getElementById("send");
    var content = document.getElementById("content");
    var disableButton = document.getElementById("disable");
	var disable = 0;
    
    function formatdata(data){
        if(data.length == 1)
        {
            return '0' + data; 
        }
        return data;
    }
    socket.on('message', function (data) {
        if((disable == 0) ) {
            var d = new Date(); // for now

            $("#chatEntries").append('<div class="message"><table width="100%" cellspacing="10"><tr>');
            $("#chatEntries").append('<td>' + formatdata(d.getHours()) +':'+ formatdata(d.getMinutes())+'.'+formatdata(d.getSeconds().toString())+'&nbsp;&nbsp;&nbsp;</td>');
            
            $("#chatEntries").append('<td bgcolor="#FF6666">' + formatdata(data.srcaddr.toString(16)) + '&nbsp;</td>');
            $("#chatEntries").append('<td bgcolor="#FFCCCC">' + formatdata(data.srcport.toString(16)) + '&nbsp;</td>');
            $("#chatEntries").append('<td bgcolor="#66FF66">' + formatdata(data.destaddr.toString(16)) + '&nbsp;</td>');
            $("#chatEntries").append('<td bgcolor="#CCFFCC">' + formatdata(data.destport.toString(16)) + '&nbsp;</td>');
            $("#chatEntries").append('<td bgcolor="#6666FF">' + formatdata(data.dlc.toString(16)) + '&nbsp;</td>');
            if(data.dlc > 0) $("#chatEntries").append('<td bgcolor="#CCCCCC">' + formatdata(data.data0.toString(16)) + '&nbsp;</td>');
            if(data.dlc > 1) $("#chatEntries").append('<td bgcolor="#EEEEEE">' + formatdata(data.data1.toString(16)) + '&nbsp;</td>');
            if(data.dlc > 2) $("#chatEntries").append('<td bgcolor="#CCCCCC">' + formatdata(data.data2.toString(16)) + '&nbsp;</td>');
            if(data.dlc > 3) $("#chatEntries").append('<td bgcolor="#EEEEEE">' + formatdata(data.data3.toString(16)) + '&nbsp;</td>');
            if(data.dlc > 4) $("#chatEntries").append('<td bgcolor="#CCCCCC">' + formatdata(data.data4.toString(16)) + '&nbsp;</td>');
            if(data.dlc > 5) $("#chatEntries").append('<td bgcolor="#EEEEEE">' + formatdata(data.data5.toString(16)) + '&nbsp;</td>');
            if(data.dlc > 6) $("#chatEntries").append('<td bgcolor="#CCCCCC">' + formatdata(data.data6.toString(16)) + '&nbsp;</td>');
            if(data.dlc > 7) $("#chatEntries").append('<td bgcolor="#EEEEEE">' + formatdata(data.data7.toString(16)) + '&nbsp;</td>');
            $("#chatEntries").append('</tr></table></div>');
        } else {
            console.log("There is a problem:", data);
        }
    });
 
   /* sendButton.onclick = function() {
        var text = field.value;
        socket.emit('send', { message: text });
    };*/
    
    disableButton.onclick = function() {
        if( disable == 0 ){
            disable = 1;
            disableButton.value = 'enable';
        }
        else
        {
            disable = 0;
            disableButton.value = 'disable';
        }
    };
}
