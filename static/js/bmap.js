var map = null;
var polyline = null;
var fixes = [];
var ts = [];
var my_markers = [];
var callback = null;
var mc = null;
var set_center = false;
var count = 0;

function initMap() {
    map = new BMap.Map("map_canvas");
    var localCity = new BMap.LocalCity();
    localCity.get(function(r) {
        if (!set_center) {
            set_center = true;
            map.centerAndZoom(r.center, r.level);
        }
    });
    if (!set_center) {
        map.centerAndZoom("Beijing");
    }
    map.enableScrollWheelZoom();
    map.addControl(new BMap.ScaleControl());
    var overvierOption = new BMap.OverviewMapControl();
    overvierOption.isOpen = true;
    map.addControl(new BMap.OverviewMapControl(overvierOption));
    map.addControl(new BMap.MapTypeControl({mapTypes: [BMAP_NORMAL_MAP,BMAP_SATELLITE_MAP],
                                            offset: new BMap.Size(100, 10)}));
    var opts = {anchor: BMAP_ANCHOR_TOP_LEFT,
                offset: new BMap.Size(10, 10)};
    map.addControl(new BMap.NavigationControl(opts));
    mc = new BMapLib.MarkerClusterer(map,
     {maxZoom: (map.getMapType().getMaxZoom() - 1),
      isAverageCenter: true,
      minClusterSize: 4}); // Note: bad performance with default 2.
}

function show_point(lat, lon, dop, markertime) {
    map.clearOverlays();
    var point = new BMap.Point(lon, lat);
    callback = sp_callback;
    BMap.Convertor.transMore([point], 0, callback);

    function sp_callback(res) {
        var point = new BMap.Point(res[0].x, res[0].y);
        var marker = new BMap.Marker(point, {title: "Current Fix"});
        fn_clickMarker(marker, markertime);
        var circle = new BMap.Circle(point, dop,
                                     {fillColor: '#AA0000',
                                      fillOpacity: 0.5,
                                      strokeWeight: 1});
        map.addOverlay(marker);
        map.addOverlay(circle);
        map.setCenter(point);
    }
}

function fn_drawLine() {
    polyline = new BMap.Polyline(fixes,
                                 {strokeColor: "red",
                                  strokeWeight: 2,
                                  strokeOpacity: 0.5});
    map.addOverlay(polyline);
}

var gc = new BMap.Geocoder();
function fn_clickMarker(marker, tempDate) {
    marker.addEventListener("click", function(e){
        gc.getLocation(e.point, function(rs){
            var s = marker.getTitle()
                +"<ul><li>Address: "+rs.address+"</li>"
                +"<li>Lon: "+rs.point.lng+"</li>"
                +"<li>Lat: "+rs.point.lat+"</li>"
                +"<li>Time: "+tempDate+"</li></ul>";
            marker.openInfoWindow(new BMap.InfoWindow(s));
        });
    });
}

function fn_locusConfirm() {
    var tempDate = $("#locusDate").val().replace(/-/g, "");
    var str_begin = $("#locusBeginSlider").val().replace(/:/g, "") + "00";
    var str_end = $("#locusEndSlider").val().replace(/:/g, "") + "00";
    var str_locusDate = "/track/".concat(tempDate, str_begin) + "/".concat(tempDate, str_end);

    $.get(str_locusDate, "", function(data) {
        var t_fixes = [];
        ts = [];
        mc.clearMarkers();
        map.clearOverlays();

        $("#fixnum").text(data.fixes.length);
        if (data.fixes.length > 0) {
            for (var i in data.fixes) {
                t_fixes[i] = new BMap.Point(data.fixes[i][2], data.fixes[i][1]);
                ts[i] = data.fixes[i][8];
            }

            set_center = false;
            fixes = [];
            my_markers = [];
            count = data.fixes.length;
            callback = line_callback;
            BMap.Convertor.transMore(t_fixes, 0, callback);
        }
    }, "json");
}

function line_callback(res) {
    for (var i in res) {
        count--;
        if (res[i].error != 0) {
            continue;
        }

        var point = new BMap.Point(res[i].x, res[i].y);
        fixes.push(point);
        var marker = new BMap.Marker(point, {title: "Point " + i});
        // map.addOverlay(marker);
        my_markers.push(marker);
        fn_clickMarker(marker, ts[i]);
    }
    if (fixes.length > 0) {
        if (!set_center) {
            set_center = true;
            map.centerAndZoom(fixes[0], Math.max(13, map.getZoom()));
        }
    }
    if (count == 0) {
        mc.addMarkers(my_markers);
        fn_drawLine();
    }
}