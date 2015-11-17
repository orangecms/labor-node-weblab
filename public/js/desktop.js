var socket = io.connect();
var sliderTimeout = 0;
var packet;
var graphdata = [];

socket.on('connect', function () {
	socket.emit('GetStat', ''); // Auf aktuellen Zustand syncen
	console.log('connected');
} );

socket.on('error', function (e) {
	console.log('System', e ? e : 'An unknown error occurred');
} );

socket.on('UpdateGUI', function(data) {
	for (var i in data) {
		var subchannel = data[i];
		switch (subchannel.fkt) {
			case 'sw':
				if (subchannel.val) {
					$("#" + subchannel.dev).html('Ein').removeClass('btn-danger').addClass('btn-success').addClass('active');
				} else {
					$("#" + subchannel.dev).html('Aus').removeClass('btn-success').removeClass('active').addClass('btn-danger');
				}
				break;
			case 'sl':
				$("#" + subchannel.dev).slider('setValue', subchannel.val);
				if ($("#" + subchannel.dev).hasClass('lockable')) {
					$("#" + subchannel.dev).data('last-slide', subchannel.val);
				}
				break;
			case 'graph':
				console.log("graph" + subchannel.val);
				for (var j in graphdata) {
					var graphitem = graphdata[j];
					if (graphitem.id == subchannel.dev) {
						graphitem.data.push(subchannel.val);
						if (graphitem.data.length > 256)
							graphitem.data.pop();
					}
				}
				updategraph();
				break;
		}
	};
} );


$(document).ready(function() {
	$('.btn').click(function(ev) {
		var target = ev.currentTarget,
			buttonId = $(target).attr('id'),
			buttonValue;
		if ($(target).hasClass('lock')) return;
                if ($(target).hasClass('nvButton')) {
			if ($(target).hasClass('active')) { //if active turn off
				buttonValue = 0;
			}
			else {
				buttonValue = 1;
			}
		}
		socket.emit('SetValue', {'fkt': 'sw', 'dev': buttonId, 'val': buttonValue});
	});

	diff = 0;

	$('.nvSlider').slider({
		min: 0,
		max: 255,
	})
	.each(function() {
		if ($(this).hasClass('lockable')) {
			$(this).data('last-slide', $(this).data('slider').value[0]);
		}
	})
	.on('slide', function(ev, ui) {
		var currentDiff = ev.value - $(ev.currentTarget).data('last-slide');
		if ($(ev.currentTarget).hasClass('locked')) {
			if (currentDiff != 0) {
				diff += currentDiff;
				packet = {'fkt': 'lock', 'dev': $(ev.currentTarget).attr('id'), 'val': 0};
				$(ev.currentTarget).parent().parent().parent().siblings().find('.lockable').each(function() {
					$(this).slider('setValue', $(this).data('slider').value[0] + currentDiff);
				}).data('last-slide', ev.value);
			}
		} else if (currentDiff != 0) {
			packet = {'fkt': 'sl', 'dev': $(ev.currentTarget).attr('id'), 'val': ev.value};
		}
		$(ev.currentTarget).data('last-slide', ev.value);
		setTimeout(function sliderTimeout() {
			if (typeof packet != "undefined") {
				if (packet.fkt == "lock") {
					packet.val = diff;
					if (diff == 0) return;
					diff = 0;
				}
				socket.emit('SetValue', packet);
				delete packet;
			}
		}, 100);
	});

	$('.lock').on('click', function() {
		if ($(this).hasClass('active')) {
			$(this).parent().siblings().find('.lockable').removeClass('locked');
		} else {
			$(this).parent().siblings().find('.lockable').addClass('locked');
		}
	});

	$('.graph-container').each(function() {
		var scales = d3.scale.linear().domain([0, 255]).nice();
		var graph = new Rickshaw.Graph({
			  element: document.getElementById(this.id + 'chart'),
			  renderer: 'line',
			  series: [
				{
				  color: 'steelblue',
				  data: [{x: 0, y: 0}],
				  name: 'Series A',
				  scale: scales
				}
			  ]
			});

		var graphaxisY = new Rickshaw.Graph.Axis.Y.Scaled({
		  element: document.getElementById(this.id + 'axis0'),
		  graph: graph,
		  orientation: 'left',
		  scale: scales,
		  tickFormat: Rickshaw.Fixtures.Number.formatKMBT
		});

		var graphaxisTime = new Rickshaw.Graph.Axis.Time({
		  graph: graph
		});

		var graphHoverDetail = new Rickshaw.Graph.HoverDetail({
		  graph: graph
		});

		graph.render();

		var graphitem = {
			'data': [],
			'id': this.id,
			'graph': graph,
			'graphaxisY': graphaxisY,
			'graphaxisTime': graphaxisTime,
			'graphHoverDetail': graphHoverDetail,
			 };

		graphdata.push(graphitem);
	});
});

function updategraph() {
	$('.graph-container').each(function() {

		var data, i, max, min, point, random, scales, series;

		data = [];
		scales = d3.scale.linear().domain([0, 255]).nice();
		for (var j in graphdata) {
			var graphitem = graphdata[j];
			if (graphitem.id == this.id) {
				for (var z in graphitem.data) {
					data.push({x: parseInt(z), y: graphitem.data[z]});
				}
				graphitem.graph.series[0].data = data;
				console.log(graphitem.graph.series[0].data);
				graphitem.graph.render();
			}
		}
	});
}

function authorize() {
	Notification.requestPermission(function(perm) {
		alert(perm);
	})
};

function show() {
	var notification = new Notification("This is a title", {
		dir: "auto",
		lang: "",
		body: "This is a notification body",
		tag: "sometag",
	});

	// notification.onclose = …
	// notification.onshow = …
	// notification.onerror = …
};

