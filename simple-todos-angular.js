Tasks = new Mongo.Collection('tasks');
Messages = new Mongo.Collection('messages');

if (Meteor.isClient) {

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });

  // This code only runs on the client
  angular.module('simple-todos',['angular-meteor']);

  function onReady() {
    angular.bootstrap(document, ['simple-todos']);
  }

  if (Meteor.isCordova)
    angular.element(document).on('deviceready', onReady);
  else
    angular.element(document).ready(onReady);

  angular.module('simple-todos').controller('TodosListCtrl', ['$scope', '$meteor',
    function ($scope, $meteor) {

      $scope.$meteorSubscribe('tasks');
      $scope.$meteorSubscribe('messages');

      $scope.tasks = $meteor.collection(function() {
        return Tasks.find($scope.getReactively('query'), {sort: {createdAt: -1}})
      });

      $scope.messages = $meteor.collection(function(){
        return Messages.find($scope.getReactively('query'), {sort: {createdAt: -1}})
      });

      $scope.getTimeDiff = function(time){
        var currentTime = new Date();
        milisec_diff = currentTime - time;
        var days = Math.floor(milisec_diff / 1000 / 60 / (60 * 24));
        var date_diff = new Date( milisec_diff );
        var returnTime;
        if(days >= 1){
         returnTime =  days + " Days "+ date_diff.getHours() + " Hours ";
        }else{
          returnTime =  date_diff.getMinutes() + " Hours " + date_diff.getMinutes() + " Minutes ";
        }
        return returnTime;
      };

      $scope.incompleteCount = function () {
      }

      $scope.addTask = function (newTask) {
        $meteor.call('addTask', newTask);
      };

      $scope.addMessage = function (newMessage){
        $meteor.call("newMessage", newMessage);
      };

      $scope.deleteTask = function (task) {
        $meteor.call('deleteTask', task._id);
      };

      $scope.setChecked = function (task) {
        $meteor.call('setChecked', task._id, !task.checked);
      };

      $scope.setPrivate = function (task) {
        $meteor.call('setPrivate', task._id, ! task.private);
      };

      $scope.$watch('hideCompleted', function() {
        if ($scope.hideCompleted)
          $scope.query = {checked: {$ne: true}};
        else
          $scope.query = {};
      });

      $scope.incompleteCount = function () {
        return Tasks.find({ checked: {$ne: true} }).count();
      };

    }]);
}

Meteor.methods({
  newMessage: function(message){
  Messages.insert({
        message: message,
        createdAt: new Date(),
        owner: Meteor.userId(),
        username: Meteor.user().username
      });
    },

  addTask: function (text) {
    // Make sure the user is logged in before inserting a task
    if (! Meteor.userId()) {
      throw new Meteor.Error('not-authorized');
    }

    Tasks.insert({
      text: text,
      createdAt: new Date(),
      owner: Meteor.userId(),
      username: Meteor.user().username
    });
  },
  deleteTask: function (taskId) {
    var task = Tasks.findOne(taskId);
    if (task.private && task.owner !== Meteor.userId()) {
      // If the task is private, make sure only the owner can delete it
      throw new Meteor.Error('not-authorized');
    }

    Tasks.remove(taskId);
  },
  setChecked: function (taskId, setChecked) {
    var task = Tasks.findOne(taskId);
    if (task.private && task.owner !== Meteor.userId()) {
      // If the task is private, make sure only the owner can check it off
      throw new Meteor.Error('not-authorized');
    }

    Tasks.update(taskId, { $set: { checked: setChecked} });
  },
  setPrivate: function (taskId, setToPrivate) {
    var task = Tasks.findOne(taskId);

    // Make sure only the task owner can make a task private
    if (task.owner !== Meteor.userId()) {
      throw new Meteor.Error('not-authorized');
    }

    Tasks.update(taskId, { $set: { private: setToPrivate } });
  }
});

if (Meteor.isServer) {
  Meteor.publish('tasks', function () {
    return Tasks.find({
      $or: [
        { private: {$ne: true} },
        { owner: this.userId }
      ]
    });
  });

  Meteor.publish('messages', function(){
    return Messages.find();

  });
}
