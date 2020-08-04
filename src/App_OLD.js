import React from 'react';
import logo from './logo.svg';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p id="location">
          Waiting for a home location.
        </p>
        <p id="watch-accuracy">
          Waiting for update.
        </p>
      </header>
      <footer className="softkey">
        <div className="row">
          <div className="col" id="softkey-left">Watch</div>
          <div className="col" id="softkey-centre">
            Set Home
            </div>
          <div className="col" id="softkey-right">Unwatch</div>
        </div>
      </footer>
    </div>
  );
}

const tele_bot_api = 'https://api.telegram.org/bot1063850757:AAH9_4f_93xi-JhJ2YswOfy7CvMWT3I3zVk/';
// ?chat_id=421576329&text=';
const CHAT_ID = '421576329';
const R_EARTH = 6371e3;// the radius (mean value) of the Earth in meters
const IDEL_INTERVAL = 2* 60*1000;// 5 min in the form of msec; 2min for testing
const DECIMAL_SCALER_6 = 1000000;
const DECIMAL_SCALER_2 = 100;
// const MY_NUMBER = '0435998105';
const softkeyCallback = { // key pressed behaviour
  left:function(){
    console.log("left key pressed.")
    if(document.getElementById('softkey-left').style.color=== "black") {// reaction
      console.log("homeLocation is set, will start watching");
      document.getElementById('softkey-right').style.color= "black";
      document.getElementById('softkey-left').style.color= "gray";
      document.getElementById('softkey-centre').style.color= "gray";
      watchLocation();
    } else {// no reaction
      console.log("button text is not black, not action triggered.");
    }
  },
  center:function(){
    console.log("central key pressed.");
    if (document.getElementById('softkey-centre').style.color=== "gray") {// no reaction
      console.log('central softkey is gray, no action triggered. try unwatch first.');
    } else {// reaction
      document.getElementById('softkey-centre').style.backgroundColor= "coral";
      document.getElementById('softkey-left').style.color= "gray";
      console.log('setHome() triggered to assign or reassign HomeLocation.');
      setHome();
    }
  },
  right:function(){
    console.log("right key pressed.")  
    if(document.getElementById('softkey-right').style.color==="black") {// reaction: initialize the app
      // navigator.geolocation.clearWatch(watcher);
      clearTimeout(watcher_2);
      wakelock.unlock(); console.log('wakelock deactivated.');
      // sendLocation('unwatched');
      crdCache = []; console.log('history location crd crdCache reset');
      retryTimes = 1;
      console.log('unwatched');
      // UI update
      document.getElementById('softkey-left').style.backgroundColor= "#61dafb";
      document.getElementById('softkey-centre').style.color= "black";
      document.getElementById('softkey-left').style.color= "black";
      document.getElementById('softkey-right').style.color= "gray";
    } else {// no reaction
      console.log("no location is watched, thus this softkey cannot be pressed.");
    }
  },
  arrowup: function(){
    //sendLocation(`Home location: www.google.com/maps/place/${homeLocation.latitude},${homeLocation.longitude}, accuracy: ${homeLocation.accuracy} m`);
    sendLocation(homeLocation.latitude,homeLocation.longitude);
  },
  arrowdown: function(){
    // sendLocation(`Current location: www.google.com/maps/place/${crdCache[0].latitude},${crdCache[0].longitude}, accuracy: ${crdCache[0].accuracy} m`);
    sendLocation(crdCache[0].latitude,crdCache[0].longitude);
  }
};

var homeLocation, wakelock, timeStamp, watcher_2;

function handleKeyDown(evt) {
  switch(evt.key){
    case "SoftLeft":
      softkeyCallback.left();
    break;
    case "SoftRight":
      softkeyCallback.right();
    break;
    case "Enter":
      softkeyCallback.center();
    break;
    case "ArrowUp":
      softkeyCallback.arrowup();
    break;
    case "ArrowDown":
      softkeyCallback.arrowdown();
    break;
    default: 
      console.log("a key without callback function was pressed.");
  }
}
function handleKeyUp(evt) {
   switch(evt.key) {
    case "SoftLeft":
      if(document.getElementById('softkey-left').style.color==='black'){document.getElementById('softkey-left').style.backgroundColor= "#61dafb"}
    break;
     default:
      document.getElementById('softkey-centre').style.backgroundColor= "#61dafb";
   }
}

function setHome () {
  console.log("Setting 'home' location.");
  document.getElementById('softkey-centre').innerText = 'locating...';
  // UI update
  document.getElementById('softkey-centre').style.color= "gray";
  // get current location
  navigator.geolocation.getCurrentPosition(successful_get,error_get,options);
}

var interval = IDEL_INTERVAL;

var timeoutCallback = function() {
  console.log('watching homeLocation');
  navigator.geolocation.getCurrentPosition(success_watch, error_watch, options);
  watcher_2 = setTimeout(timeoutCallback, interval);
}

function watchLocation () {
  console.log(`watchLocation activated`);
  watcher_2 = setTimeout(timeoutCallback,IDEL_INTERVAL);
  //deprecated code:// watcher = navigator.geolocation.watchPosition(success_watch, error_watch, options);
  wakelock = window.navigator.requestWakeLock('gps');
  console.log('wakelock set');
  // UI left key background => green
  document.getElementById('softkey-left').style.backgroundColor= "#24ee11";
  // sendLocation(`Watching location www.google.com/maps/place/${homeLocation.latitude},${homeLocation.longitude}`);
  sendLocation(homeLocation.latitude,homeLocation.longitude);
}

var options = {
  enableHighAccuracy: true,
  timeout: 8000,
  maximumAge: 0
};

var crdCache = [];

function successful_get(pos) {
  let crd = pos.coords;
  crdCache.push(crd);
  if(crd.accuracy < 86) {
    //sendLocation(`Set www.google.com/maps/place/${crd.latitude},${crd.longitude} (${crd.accuracy} m) as home.`);
    sendLocation(crd.latitude,crd.longitude);
    console.log(`Latitude : ${crd.latitude}\nLongitude: ${crd.longitude}\nAccuracy: ${crd.accuracy} meters.`);
    homeLocation = crd;// important: assigns homeLocation variable that is used as the reference of success_watch.
    // UI update
    document.getElementById('location').innerText=`Latitude : ${crd.latitude}\n Longitude: ${crd.longitude} \n Accuracy: ${crd.accuracy} meters.`;
    document.getElementById('softkey-centre').innerText=`Reset`;
    document.getElementById('softkey-left').style.color= "black";
    document.getElementById('softkey-centre').style.color= "black";
  } else {
    console.log(`Latitude : ${crd.latitude}\n Longitude: ${crd.longitude} \n Accuracy: ${crd.accuracy} meters.`);
    console.log("Not enough accuracy, again...");
    setHome();
  }
  timeStamp = new Date();
}

function success_watch(pos) {
  // get current location
  let crd = pos.coords;
  crdCache.push(crd);
  // get current time
  let nowTime = new Date();
  // calculate displacement
  let displacement = decimalRound(haversine(crdCache[0].latitude,crdCache[0].longitude,crdCache[1].latitude,crdCache[1].longitude),DECIMAL_SCALER_2);// in meters
  // calculate distance from home
  let distance = decimalRound(haversine(homeLocation.latitude,homeLocation.longitude,crdCache[1].latitude,crdCache[1].longitude),DECIMAL_SCALER_2);// in meters
  // calculate speed
  let speed = displacement / ((nowTime - timeStamp)/1000);// in m/sec
  console.log(`timestamp: ${timeStamp}\nnow it is:   ${nowTime}\ntime passed: ${nowTime-timeStamp} ms\ndisplacement :${displacement} m\nspeed is ${speed} m/s`);
  if(speed > 1 || distance > 30 ) {// test speed threshold 1, distance 30
    console.log('alert triggered');
    // sendLocation(`current location: www.google.com/maps/place/${crd.latitude},${crd.longitude}, accuracy: ${crd.accuracy} m, distance from home: ${distance}, speed: ${speed} m/s`);
    sendLocation(crd.latitude,crd.longitude);
    // shorten interval
    interval = 10000;
    // UI update
    document.getElementById("watch-accuracy").innerText=`Moving (Accu: ${crd.accuracy} m)`;
    document.getElementById('softkey-left').style.backgroundColor= "#24ee11";// green
  } else {
    interval = IDEL_INTERVAL;
    // UI update
    console.log(`alert not triggered, distance from home: ${distance} meters, deemed stable (Accu: ${crd.accuracy} m).`);
    document.getElementById("watch-accuracy").innerText=`Stable (Accu: ${crd.accuracy} m)`;
  }
  //
  crdCache.shift();
  timeStamp = nowTime;
}

var retryTimes = 1;

function error_get(err) {
  console.log(`Get ERROR(${err.code}): ${err.message}. Retrying...(${retryTimes})`);
  setHome();
  retryTimes += 1;
}

function error_watch(err) {
  interval = 10000; console.log(`Watch ERROR(${err.code}): ${err.message}. Try watching in ${interval} ms`);
  // UI update
  document.getElementById('softkey-left').style.backgroundColor= "#fc4848";// left button background => red
}

const LIVE_PERIOD = 5*60;
function sendLocation(latitude,longitude) {
  // http post init
  let xhr = new XMLHttpRequest();
  xhr.open('POST',tele_bot_api+'sendLocation');
  xhr.setRequestHeader('Content-Type', 'application/json');
  // assembel post payload
  let payload = {
    "chat_id": CHAT_ID,
    "latitude" : latitude,
    "longitude": longitude,
    "live_period": LIVE_PERIOD
  };
  // send http post request
  xhr.send(JSON.stringify(payload));
}

function updateLocation(latitude,longitude) {
  let xhr = new XMLHttpRequest();
  xhr.open('POST',tele_bot_api+'editMessageLiveLocation');
  xhr.setRequestHeader('Content-Type', 'application/json');
  let payload = {
    "chat_id": CHAT_ID,
    "latitude" : latitude,
    "longitude": longitude
  };
  xhr.send(JSON.stringify(payload));
}

function sendMessage(msg) {
  let xhr = new XMLHttpRequest();
  xhr.open('POST',tele_bot_api+'sendMessage');
  xhr.setRequestHeader('Content-Type', 'application/json');
  let payload = {
    "char_id": CHAT_ID,
    "text": msg
  };
  xhr.send(JSON.stringify(payload));
}

function decimalRound (input,DECIMAL_SCALER) {
  return Math.round(DECIMAL_SCALER * input) / DECIMAL_SCALER;
}
function haversine(phi1,lambda1,phi2,lambda2) {
  // φ1, φ2 are the latitude of point 1 and latitude of point 2 (in radians),
  // λ1, λ2 are the longitude of point 1 and longitude of point 2 (in radians).
  console.log(phi1,lambda1,phi2,lambda2);
  phi1 = decimalRound(phi1 * Math.PI/180,DECIMAL_SCALER_6);
  phi2 = decimalRound(phi2 * Math.PI/180,DECIMAL_SCALER_6);
  let delta_phi = decimalRound((phi2-phi1) * Math.PI/180, DECIMAL_SCALER_6);
  let delta_lambda = decimalRound((lambda2-lambda1) * Math.PI/180, DECIMAL_SCALER_6);
  // lambda1 = decimalRound(lambda1 * Math.PI/180,DECIMAL_SCALER_6);
  // lambda2 = decimalRound(lambda2 * Math.PI/180,DECIMAL_SCALER_6);
  let a = Math.sin(delta_phi/2) * Math.sin(delta_phi/2) +
          Math.cos(phi1) * Math.cos(phi2) *
          Math.sin(delta_lambda/2) * Math.sin(delta_lambda/2);
  return 2 * R_EARTH * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    // deprecated implementation: return 2 * R_EARTH * Math.asin(Math.pow(Math.sqrt(Math.sin(0.5 * (phi1-phi2))),2) + Math.cos(phi1) * Math.cos(phi2) * Math.pow(Math.sqrt(Math.sin(0.5 * (lambda1-lambda2))),2));
}
document.addEventListener("keydown",handleKeyDown);
document.addEventListener("keyup",handleKeyUp);
export default App;
