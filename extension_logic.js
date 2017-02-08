// extension_logic.js is loaded as a background script and handles app logic and storage

// Globals
// 
var kFirstRunTaskMsg = 'Create a task with the \'Add Task\' button below',
	kDefaultBlockedSitesArray = ['*://*.reddit.com/','*://*.facebook.com/','*://*.twitter.com/'],
	siteBlockerEnabled = true;

// Listen for messages from the New Tab page (homepage.html)
//
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
	if ( request.taskCompleted )            completeTask(request.taskCompleted);
	if ( request.action == 'newPage' )      newPage();
	if ( request.action == 'resetTasks' )   resetTasksToDefaultsAndSendToPage();
	if ( request.action == 'toggleBlocking' ) toggleBlocking();
	if ( request.addTask )                  addTask(request.addTask);
	if ( request.deleteTask )               deleteTask(request.deleteTask);
	if ( request.updateBlockedList )        updateBlockedList(request.updateBlockedList);
});

function addTask(task) {
	chrome.storage.local.get('todaysTaskArray', function(returnValue) {
		var tasks = returnValue.todaysTaskArray;
		tasks.push(task);
        if ( tasks[0] == kFirstRunTaskMsg ) {
            tasks.shift();
        }
		chrome.storage.local.set({'todaysTaskArray':tasks});
		sendTasksToPage(tasks);
	});    
	chrome.storage.local.get('dailyTaskArray', function(returnValue) {
		var tasks = returnValue.dailyTaskArray;
        // if the only daily task is the first run task, replace it
        // otherwise add the task to the task array
		if ( tasks[0] == kFirstRunTaskMsg ) {
			tasks = [task];
		} else {
			tasks.push(task);
		}
		chrome.storage.local.set({'dailyTaskArray':tasks});
	});    
}

// "Completing" a task removes it for today
// It will come back tomorrow.
//
function completeTask(task) {
	chrome.storage.local.get('todaysTaskArray', function(returnValue) {
		var tasks = returnValue.todaysTaskArray,
			index = tasks.indexOf(task);
		tasks.splice(index, 1);
		chrome.storage.local.set({'todaysTaskArray':tasks});
		if ( tasks.length == 0 ) {
			chrome.runtime.sendMessage({'action': 'tasksCompleted'});
			turnOffBlocking();
		}
	});
}

// "Deleting" a task removes it forever
// You will never see it again
function deleteTask(task) {
	chrome.storage.local.get('dailyTaskArray', function(returnValue) {
		var tasks = returnValue.dailyTaskArray,
			index = tasks.indexOf(task);
		tasks.splice(index, 1);
		if ( tasks.length == 0 ) {
			tasks = [kFirstRunTaskMsg];
		}
		chrome.storage.local.set({'dailyTaskArray':tasks});
		completeTask(task);
	});
}

// main function that is called when a new tab is opened
// 
function newPage() {
    // first check the date
	chrome.storage.local.get('currentDate', function(returnValue) {
		var d = new Date();
        // if there's no date, then assume this is a first time launch
		if ( typeof returnValue.currentDate === 'undefined' ) {
			chrome.storage.local.set({'currentDate':d.toDateString()});
			chrome.storage.local.set({'dailyTaskArray':[kFirstRunTaskMsg]});
			chrome.storage.local.set({'todaysTaskArray':[kFirstRunTaskMsg]});
			chrome.storage.local.set({'blockedSitesArray':kDefaultBlockedSitesArray}, function() {
				sendTasksToPage([kFirstRunTaskMsg]);
				turnOnBlocking();
			});
        // if the saved date is different than today, then reset the tasks to the defaults
		} else if ( d.toDateString() !== returnValue.currentDate ) {
			chrome.storage.local.set({'currentDate':d.toDateString()});
			chrome.storage.local.get('dailyTaskArray', function(returnValue) {
				chrome.storage.local.set({'todaysTaskArray':returnValue.dailyTaskArray});
				sendTasksToPage(returnValue.dailyTaskArray);
			});
			turnOnBlocking();
        // if the date is the same, then just display the current task list
		} else {
			chrome.storage.local.get('todaysTaskArray', function(returnValue) {
				sendTasksToPage(returnValue.todaysTaskArray);
				if ( returnValue.todaysTaskArray.length != 0 ) {
					turnOnBlocking();
				}
			});
		}
	});  
}

function sendTasksToPage(tasks) {
	chrome.storage.local.get('blockedSitesArray', function(returnValue) {
		chrome.runtime.sendMessage({'taskList': tasks, blockedList: returnValue.blockedSitesArray});
	});
}

// User has clicked the "Undo All Tasks" button
function resetTasksToDefaultsAndSendToPage() {
	chrome.storage.local.get('dailyTaskArray', function(returnValue) {
		chrome.storage.local.set({'todaysTaskArray':returnValue.dailyTaskArray});
		sendTasksToPage(returnValue.dailyTaskArray);
		turnOnBlocking();
	});
}

// Code that does the blocking/unblocking
// 
var blockSites = function() {
	var home = chrome.extension.getURL('homepage.html?blocked=true');
	return {redirectUrl: home};
};

function turnOnBlocking() {
	siteBlockerEnabled = true;
	chrome.runtime.sendMessage({'blockingStatus': 'on' });
	chrome.storage.local.get('blockedSitesArray', function(returnValue) {
		chrome.webRequest.onBeforeRequest.addListener( blockSites, { urls: returnValue.blockedSitesArray }, ['blocking'] );
		console.log("error?");
		console.log(chrome.runtime.lastError);
	});
}

function turnOffBlocking() {
	siteBlockerEnabled = false;
	chrome.webRequest.onBeforeRequest.removeListener(blockSites);
	chrome.runtime.sendMessage({'blockingStatus': 'off' });
}

function toggleBlocking() {
	siteBlockerEnabled ? turnOffBlocking() : turnOnBlocking();
}

function updateBlockedList(blockedList) {
	chrome.storage.local.set({blockedSitesArray: blockedList}, function() {
		turnOffBlocking();
		turnOnBlocking();
	});
}
