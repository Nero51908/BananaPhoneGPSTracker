import React from 'react';
import logo from './logo.svg';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p id="location">
          Waiting to get a home location.
        </p>
        <p id="watch-accuracy">
          Not watching.
        </p>
      </header>
      <footer className="softkey">
        <div className="row">
          <div className="col" id="softkey-left">Watch</div>
          <div className="col" id="softkey-centre">Set Home</div>
          <div className="col" id="softkey-right">Unwatch</div>
        </div>
      </footer>
    </div>
  );
}

const TELE_BOT_URL = 'https://api.telegram.org/bot1063850757:AAH9_4f_93xi-JhJ2YswOfy7CvMWT3I3zVk/';
// ?chat_id=421576329&text=';
const CHAT_ID = '421576329';// could be user input value in a pulic release
const R_EARTH = 6371e3;// the radius (mean value) of the Earth in meters
const DECIMAL_SCALER_6 = 1000000;
const DECIMAL_SCALER_2 = 100;
const LIVE_PERIOD = 10800;//86400;// sec, set as 5 min for test. 24 hours for real application.
const REACT_BLUE = "#61dafb";
var wakelock,watcher;
var beaconCounter = 0;
class Location_Cache {
    constructor(){
        this.pos_hist = [];
    }

    setHome(pos,timeStamp){
        if (this.pos_hist.length > 0) {
            pos.timeStamp = timeStamp;
            this.pos_hist[0] = pos;
        } else {
            this.newEntry(pos,timeStamp)
        }
    }

    last(){
        return this.pos_hist[this.pos_hist.length-1];
    }

    dstfromHome(){
        return decimalRound(haversine(this.pos_hist[0].latitude,this.pos_hist[0].longitude,this.last().latitude,this.last().longitude),DECIMAL_SCALER_2);// in meters
    }

    timeDiff(){
        if (this.pos_hist.length > 1) {
            return (this.last().timeStamp - this.pos_hist[this.pos_hist.length - 2].timeStamp) / 1000;// in sec
        } else {
            return 1e11;// this number should be much bigger than any point to point distance on the Earth surface.
        }
    }

    speed(){
        if (this.pos_hist.length > 1){
            let displacement = decimalRound(haversine(this.pos_hist[this.pos_hist.length-2].latitude,this.pos_hist[this.pos_hist.length-2].longitude,this.last().latitude,this.last().longitude),DECIMAL_SCALER_2);
            return displacement / this.timeDiff();
        } else {
            return this.dstfromHome() / ((this.last().timeStamp - this.pos_hist[0].timeStamp) / this.timeDiff());
        }
    }
    
    newEntry(pos,timeStamp){
        if (this.pos_hist.length >= 3) {
            let tmp = this.pos_hist.shift();
            this.pos_hist.shift();
            this.pos_hist.unshift(tmp);
        }
        pos.timeStamp = timeStamp;
        this.pos_hist.push(pos);
    }

}
var location_cache = new Location_Cache();
var ll_message_id = 0; // live location message id, initialized as '0'
const TELE_BOT_API = {
  sendMessage: function(msg){
      let xhr = new XMLHttpRequest();
      xhr.open('POST',TELE_BOT_URL+'sendMessage');
      xhr.setRequestHeader('Content-Type', 'application/json');
      let payload = {
        "chat_id": CHAT_ID,
        "text": msg
      };
      xhr.send(JSON.stringify(payload));
      xhr.onreadystatechange = function(){
          if (xhr.readyState === 4) {
              console.log('Sent: '+ msg);
          }
      }
  },
  sendStaticLocation: function(pos,msgTitle){
      let xhr = new XMLHttpRequest();
      xhr.open('POST',TELE_BOT_URL+'sendVenue');
      xhr.setRequestHeader('Content-Type', 'application/json');
      let payload = {
        "chat_id": CHAT_ID,
        "latitude" : pos.latitude,
        "longitude": pos.longitude,
        "title": msgTitle,
        "address": `Accuracy: ${decimalRound(pos.accuracy,DECIMAL_SCALER_2)} meters`
      };
      xhr.send(JSON.stringify(payload));
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          console.log('Static Location sent successfully.\n'+xhr.response);
        }
      };
    },
    startLiveLocation: function(pos){
        // send pos to telegram CHAT_ID
        let xhr = new XMLHttpRequest();
        xhr.open('POST',TELE_BOT_URL+'sendLocation');
        xhr.setRequestHeader('Content-Type', 'application/json');
        // assembel post payload
        let payload = {
            "chat_id": CHAT_ID,
            "latitude" : pos.latitude,
            "longitude": pos.longitude,
            "live_period": LIVE_PERIOD
        };
        // send http post request
        xhr.send(JSON.stringify(payload));
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
              let obj = JSON.parse(xhr.response);
              console.log(`live location response: ${xhr.response}`);
              // return message_id;
              ll_message_id = obj.result.message_id; console.log('ll_message_id: '+ll_message_id)
              // set timeout to clear ll_message_id
              setTimeout(()=>{ll_message_id = 0;console.log('ll_message_id reset.')},LIVE_PERIOD * 1000);
          }
        };
    },
    updateLiveLocation: function(pos,message_id){
        let xhr = new XMLHttpRequest();
        xhr.open('POST',TELE_BOT_URL+'editMessageLiveLocation');
        xhr.setRequestHeader('Content-Type', 'application/json');
        let payload = {
            "chat_id": CHAT_ID,
            "latitude" : pos.latitude,
            "longitude": pos.longitude,
            "message_id": message_id    
        };
        xhr.send(JSON.stringify(payload));
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                console.log('Update live location response: '+xhr.response);
            }
        };
    }
}

const successCall = {
    setHome: function(pos) {
        if (pos.coords.accuracy < 10000) {
            // add entry location_cache[0]
            location_cache.setHome(pos.coords,new Date()); homeSet = true;
            // send home location to telegram 
            TELE_BOT_API.sendStaticLocation(pos.coords,'Home Location');
            console.log('Home Location is set')
            // update UI
            document.getElementById('location').innerText=`Latitude : ${decimalRound(pos.coords.latitude,DECIMAL_SCALER_6)}\n Longitude: ${decimalRound(pos.coords.longitude,DECIMAL_SCALER_6)} \n Accuracy: ${decimalRound(pos.coords.accuracy,DECIMAL_SCALER_2)} meters.`;
            document.getElementById('softkey-centre').innerText=`Reset`;
            document.getElementById('softkey-left').style.color= "black";
            document.getElementById('softkey-centre').style.color= "black";
        } else {
            console.log("Not enough accuracy, again...");
            // setHome btn callback()
            setBtnCallback();
        }
    },
    periodicCheck: function(pos) {
      // push new location to cache
      location_cache.newEntry(pos.coords,new Date());
      console.log('Got current location. (Periodic run)');
      // on success update bypassNorm using location_cache.speed and .dstfromHome, determine alert mode "moving","farfromhome","default"
      let watcherMode;
      if(location_cache.speed() > 6){ // 6 meters/sec = 21.6 km/h
        watcherMode = "moving";
      } else {
        if(location_cache.dstfromHome() > 100) {
          watcherMode = "farfromHome";
        } else {
          watcherMode = 'default';
        }
      }
      // UI update
      document.getElementById('softkey-left').style.backgroundColor="LawnGreen";
      document.getElementById('watch-accuracy').innerText = `${watcherMode} (${beaconCounter++})`;
      TELE_BOT_API.sendMessage(`Alive: +${beaconCounter}`);
      // execute alert 
      switch(watcherMode){
        case "moving":
          console.log('moving branch active.');
          if(ll_message_id === 0){
            TELE_BOT_API.startLiveLocation(pos.coords);
          }
          TELE_BOT_API.updateLiveLocation(pos.coords,ll_message_id);
          // update 22 times 
          let counter = 0;
          // for (counter =1; counter<23;counter++) {
          //   setTimeout(()=>{
          //     navigator.geolocation.getCurrentPosition(successCall.live,handle_error.live,options_live)
          //     },
          //   5000 * counter);
          // }
          let updateSchedule = setInterval(()=>{
            if(counter === 22){
              clearInterval(updateSchedule);
            }else{
              navigator.geolocation.getCurrentPosition(successCall.live,handle_error.live,options_live);console.log('Moving update:'+ counter++);
            }
          },5000);
          break;
        case "farfromHome":
          console.log('farfromHome branch active');
          if(ll_message_id === 0){
            TELE_BOT_API.startLiveLocation(pos.coords);
          } else{
            TELE_BOT_API.updateLiveLocation(pos.coords,ll_message_id);
          }
          break;
        default:
          console.log('default branch, do nothing utill the next periodic check.');
      }
    },
    live: function(pos) {
        // newEntry(pos,new Date())
        location_cache.newEntry(pos.coords,new Date());
        // send live location
        TELE_BOT_API.updateLiveLocation(pos.coords,ll_message_id);console.log(`live location update sent.`);
    },
    static: function(pos) {
        // newEntry to location_cache
        location_cache.newEntry(pos.coords,new Date());
        // send static location
        TELE_BOT_API.sendStaticLocation(pos.coords,'Far from Home alert');
        console.log('Far from home alert sent.')
    }
};

var retryTimes = 1;
var homeSet = false;
const handle_error = {
  setHome: function(err){
    console.log(`Get ERROR(${err.code}): ${err.message}. Retrying...(${retryTimes})`);
      if(!homeSet){
        setBtnCallback();
        retryTimes += 1;
      }
  },
  periodicCheck: function(err){
    console.log(`Live ERROR(${err.code}): ${err.message}. Waiting for the next beacon.`);
    // UI Update
    document.getElementById('softkey-left').style.backgroundColor="red";
    document.getElementById('watch-accuracy').innerText = `${err.message} (${beaconCounter++})`;
    TELE_BOT_API.sendMessage(`Alive: +${beaconCounter}`);
  },
  live: function(err){
      // updateLiveLocation()
      console.log(`Live ERROR(${err.code}): ${err.message}.`);
  },
  static: function(err){
      // reportStaticLocation()
      console.log(`Static ERROR(${err.code}): ${err.message}.`);
  }
};

function watchBtnCallback(){//when watch btn is pressed, start
  if (watcherSet){
    // periodic check current location to detect
    console.log('periodic location check routine started.');
    navigator.geolocation.getCurrentPosition(successCall.periodicCheck,handle_error.periodicCheck,options);
  }
}
//
const beaconPeriod = 15;// sec
var watcherSet = false;
//
const softkeyCallback = { // key pressed behaviour
  left:function(){
    console.log("left key pressed.")
    if(document.getElementById('softkey-left').style.color=== "black") {// reaction
      // run watchBtnCallback every 120 sec. set to 8000 for testing.
      watcherSet = true;
      watcher = setInterval(watchBtnCallback, beaconPeriod*1000);console.log(`watcher set with interval ${beaconPeriod} sec.`);
      // wake lock
      wakelock = window.navigator.requestWakeLock('gps');console.log('wakelock set');
      // UI update
      console.log("homeLocation is set, will start watching");
      document.getElementById('softkey-right').style.color= "black";
      document.getElementById('softkey-left').style.color= "gray";
      document.getElementById('softkey-left').style.backgroundColor="LawnGreen";
      document.getElementById('softkey-centre').style.color= "gray";
      document.getElementById('watch-accuracy').innerText = 'Watching';
    } else {// no reaction
      console.log("button text is not black, not action triggered.");
    }
  },
  center:function(){
    console.log("central key pressed.");
    if (document.getElementById('softkey-centre').style.color=== "gray") {// no reaction
      console.log('central softkey is gray, no action triggered. try unwatch first.');
    } else {// reaction
      homeSet = false;
      setBtnCallback();console.log('centre btn triggered set home routine.');
      // UI update
      document.getElementById('softkey-centre').style.backgroundColor= "red";
      document.getElementById('softkey-left').style.color= "gray";
    }
  },
  right:function(){
    console.log("right key pressed.")  
    if(document.getElementById('softkey-right').style.color==="black") {// reaction: initialize the app
      clearInterval(watcher);watcherSet = false;console.log('period location update stopped (unwatched).');
      // unlock wakelock
      wakelock.unlock(); console.log('wakelock deactivated.');
      // clear cached locations
      location_cache = new Location_Cache(); console.log('history location crd crdCache reset');
      // reset retryTimes counter
      retryTimes = 1;
      // reset 
      // UI update
      document.getElementById('softkey-left').style.backgroundColor= REACT_BLUE;
      document.getElementById('softkey-centre').style.color= "black";
      document.getElementById('softkey-left').style.color= "black";
      document.getElementById('softkey-right').style.color= "gray";
      document.getElementById('watch-accuracy').innerText = 'Not Watching';
    } else {// no reaction
      console.log("no location is watched, thus this softkey cannot be pressed.");
    }
  },
  arrowup: function(){
    farfromHome_test();
  },
  arrowdown: function(){
    moving_test();
  }
};
function farfromHome_test(){
  navigator.geolocation.getCurrentPosition(function(pos){
  console.log('farfromHome branch test');
  console.log('ll_message_id: '+ ll_message_id);
  if(ll_message_id === 0){
    TELE_BOT_API.startLiveLocation(pos.coords);
  } else {
    console.log('ll_message_id: '+ ll_message_id);
    TELE_BOT_API.updateLiveLocation(pos.coords,ll_message_id);
  }
  },handle_error.live,options);
  
}

function moving_test(){
  navigator.geolocation.getCurrentPosition(function(pos){
    console.log('moving branch test');
    console.log('ll_message_id: '+ ll_message_id);
    if(ll_message_id === 0){
      TELE_BOT_API.startLiveLocation(pos.coords);console.log('ll_message_id is 0, start a new live location.');
    }
    console.log('ll_message_id: '+ ll_message_id);
    TELE_BOT_API.updateLiveLocation(pos.coords,ll_message_id);console.log('1st update to live location after starting.');
    // update 22 times 
    let counter = 0;
    // for (counter =1; counter<23;counter++) {
    //   setTimeout(()=>{
    //     navigator.geolocation.getCurrentPosition(successCall.live,handle_error.live,options_live)
    //     },
    //   5000 * counter);
    // }
    let updateSchedule = setInterval(()=>{
      if(counter === 22){
        clearInterval(updateSchedule);
      }else{
        navigator.geolocation.getCurrentPosition(successCall.live,handle_error.live,options_live);console.log('Moving update:'+ counter++);
      }
    },5000);
  },
  handle_error.live,options);
}

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
      if(document.getElementById('softkey-left').style.color==='black'){document.getElementById('softkey-left').style.backgroundColor= REACT_BLUE}
    break;
     default:
      document.getElementById('softkey-centre').style.backgroundColor= REACT_BLUE;
   }
}

function setBtnCallback () {
  // get current location
  navigator.geolocation.getCurrentPosition(successCall.setHome,handle_error.setHome,options);console.log("Setting Home location.");
  // UI update
  document.getElementById('softkey-centre').innerText = 'locating...';
  document.getElementById('softkey-centre').style.color= "gray";
}


var options = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 10000
};
var options_live = {
  enableHighAccuracy: true,
  timeout: 8000,
  maximumAge: 8000
};


function decimalRound (input,DECIMAL_SCALER) {
  return Math.round(DECIMAL_SCALER * input) / DECIMAL_SCALER;
}
function haversine(phi1,lambda1,phi2,lambda2) {
  // console.log(phi1,lambda1,phi2,lambda2);
  // φ1, φ2 are the latitude of point 1 and latitude of point 2 (in radians),
  // λ1, λ2 are the longitude of point 1 and longitude of point 2 (in radians).
  phi1 = decimalRound(phi1 * Math.PI/180,DECIMAL_SCALER_6);
  phi2 = decimalRound(phi2 * Math.PI/180,DECIMAL_SCALER_6);
  let delta_phi = decimalRound((phi2-phi1) * Math.PI/180, DECIMAL_SCALER_6);
  let delta_lambda = decimalRound((lambda2-lambda1) * Math.PI/180, DECIMAL_SCALER_6);
  let a = Math.sin(delta_phi/2) * Math.sin(delta_phi/2) +
          Math.cos(phi1) * Math.cos(phi2) *
          Math.sin(delta_lambda/2) * Math.sin(delta_lambda/2);
  return 2 * R_EARTH * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    // deprecated implementation: return 2 * R_EARTH * Math.asin(Math.pow(Math.sqrt(Math.sin(0.5 * (phi1-phi2))),2) + Math.cos(phi1) * Math.cos(phi2) * Math.pow(Math.sqrt(Math.sin(0.5 * (lambda1-lambda2))),2));
}
document.addEventListener("keydown",handleKeyDown);
document.addEventListener("keyup",handleKeyUp);
export default App;