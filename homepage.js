// homepage.js is loaded by homepage.html and handles page rendering and user events

// Set up view and events
// 
var allTasksComplete = document.querySelector('.all-tasks-complete');

allTasksComplete.style.display = 'none';
document.querySelector('.addTaskFormContainer').style.display = 'none';
document.querySelector('.restartDefaultTasksBtn').addEventListener('click', function() {
	chrome.runtime.sendMessage({action: 'resetTasks'});
});
document.querySelector('.blockingToggleBtn').addEventListener('click', function() {
	chrome.runtime.sendMessage({action: 'toggleBlocking'});
});
document.querySelector('.blockedSitesListBtn').addEventListener('click', function() {
	if ( document.querySelector('.blockURLsUI').style.display === '' ) {
		document.querySelector('.blockURLsUI').style.display = 'none';
	} else {
		document.querySelector('.blockURLsUI').style.display = '';
		document.querySelector('.blockerURLsTextArea').focus();
	}
});
document.querySelector('.addTaskBtn').addEventListener('click', function() {
	document.querySelector('.addTaskBtnContainer').style.display = 'none';
	document.querySelector('.addTaskFormContainer').style.display = '';
	document.querySelector('.addTaskInput').focus();

});
document.querySelector('.addTaskSubmit').addEventListener('click', function() {
	var taskText = document.querySelector('.addTaskInput').value;
	if ( taskText.length > 0 ) {
		chrome.runtime.sendMessage({'addTask': taskText});
		document.querySelector('.addTaskBtnContainer').style.display = '';
		document.querySelector('.addTaskFormContainer').style.display = 'none';
		document.querySelector('.addTaskInput').value = '';
	} else {
		alert('Put some text in there');
	}
});
document.querySelector('.blockedURLsFormSubmit').addEventListener('click', function() {
	var blockedListString = document.querySelector('.blockerURLsTextArea').value;
	blockedListString = blockedListString.trim();
	chrome.runtime.sendMessage({'updateBlockedList': blockedListString.split('\n')});
});

// Incoming messages from extension_logic.js
// 
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
	if ( Array.isArray(request.taskList) ) {
		populateTaskList(request.taskList,request.blockedList);
	}
	if ( request.blockedList) {
		document.querySelector('.blockerURLsTextArea').value = request.blockedList.join('\n') + '\n';
	}
	if ( request.action == 'tasksCompleted' ) {
		allTasksComplete.style.display = '';
	}
	if ( request.blockingStatus ) {
		if ( request.blockingStatus === 'off' ) {
			document.querySelector('.blockingToggleBtn').innerHTML = 'Enable Blocking';
			document.querySelector('.blocked-message').style.display = 'none';
		} else {
			document.querySelector('.blockingToggleBtn').innerHTML = 'Disable Blocking';
		}
	}
});

// Update view
// 
function populateTaskList(tasks,blocked) {
	var list = document.querySelectorAll('ul')[0];
	list.innerHTML = '';
	document.querySelector('.blockURLsUI').style.display = 'none';
	if ( tasks.length == 0 ) {
		allTasksComplete.style.display = '';
		document.querySelector('.blocked-message').style.display = 'none';
		return;
	} else {
		allTasksComplete.style.display = 'none';
	}

	tasks.forEach(function(i) {
		var li = document.createElement('li'),
			taskDiv = document.createElement('div'),
			linkToDeleteTask = document.createElement('a');
		taskDiv.classList.add('task-div');
		taskDiv.innerHTML = i;
		li.appendChild(taskDiv);
		linkToDeleteTask.innerHTML = 'Delete permanently';
		linkToDeleteTask.dataset.task = i;
		linkToDeleteTask.addEventListener('click', function(e) {
			e.stopPropagation();
			e.target.parentElement.style.display = 'none';
			chrome.runtime.sendMessage({'deleteTask': this.dataset.task });
		});
		linkToDeleteTask.classList.add('link-to-delete-task-hidden');
		li.appendChild(linkToDeleteTask);
		li.addEventListener('mouseover', function() {
			var el = this.querySelector('.link-to-delete-task-hidden');
			el.classList.remove('link-to-delete-task-hidden');
			el.classList.add('link-to-delete-task');
		});
		li.addEventListener('mouseout', function() {
			var el = this.querySelector('.link-to-delete-task');
			el.classList.add('link-to-delete-task-hidden');
			el.classList.remove('link-to-delete-task');
		});
		list.appendChild(li);
	});

	document.querySelectorAll('li').forEach(function(i) {
		i.addEventListener('click',function() {
			i.style.display = 'none';
			var taskText = i.querySelector('.task-div');
			chrome.runtime.sendMessage({'taskCompleted': taskText.innerHTML});
		});
	});
	document.querySelector('.blockerURLsTextArea').value = blocked.join('\n') + '\n';
}

// Init
// 
// Check if we're coming from an attempt to visit a blocked site
//
var urlParams = new URLSearchParams(window.location.search);
if ( urlParams.get('blocked') ) {
	document.querySelector('.blocked-message').style.display = '';
} else {
	document.querySelector('.blocked-message').style.display = 'none';

}

document.querySelector('.blockURLsUI').style.display = 'none';

// Tell extension_logic.js that we want fresh data
chrome.runtime.sendMessage({action: 'newPage'});
