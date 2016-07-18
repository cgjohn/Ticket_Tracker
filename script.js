var app = angular.module('ticketApp', ['ngRoute', 'firebase']); 

app.run(["$rootScope", "$location", function($rootScope, $location) {
  $rootScope.$on("$routeChangeError", function(event, next, previous, error) {
    // We can catch the error thrown when the $requireSignIn promise is rejected
    // and redirect the user back to the home page
    if (error === "AUTH_REQUIRED") {
      $location.path("/login");
    }
  });
}]);


app.config(function($routeProvider) {
	$routeProvider.when('/', {
		controller: 'HomeCtrl',
		templateUrl: 'templates/home.html',
		
    })

	$routeProvider.when('/login', {
		controller: 'LoginCtrl',
		templateUrl: 'templates/login.html',
	})

});

app.controller('HomeCtrl', function($scope, $firebaseAuth, $firebaseObject, $window) {
   $scope.authObj = $firebaseAuth();
	
    $scope.errorMessage = "";

	$scope.signUp = function(){

		$scope.authObj.$createUserWithEmailAndPassword($scope.email, $scope.password)
			.then(function(firebaseUser) {
				console.log("User " + firebaseUser.uid + " created successfully!");
				

	  			var ref = firebase.database().ref().child('users').child(firebaseUser.uid);
	  			$scope.users = $firebaseObject(ref);

	  			$scope.users.name = $scope.name;
	  			$scope.users.email = $scope.email;
	  			$scope.users.userID = firebaseUser.uid;
	  			$scope.users.time_created = Date.now();
	  			$scope.users.$save();

				$window.location.href = '#/'; //redirects to the home page

			}).catch(function(error) {
				$scope.errorMessage = error.message;
			});
	}
});

app.controller('LoginCtrl', function($scope, $firebaseAuth, $firebaseObject, $window) {
    $scope.authObj = $firebaseAuth();
	
	$scope.login = function(){
		$scope.errorMessage = "";
		console.log($scope.email);
		console.log($scope.password);

		$scope.authObj.$signInWithEmailAndPassword($scope.email, $scope.password)
		.then(function(firebaseUser) {
			console.log("Signed in as:", firebaseUser.uid);
			$scope.firebaseUser1 = firebaseUser;
			console.log($scope.firebaseUser1);
			$window.location.href = '#/';
		}).catch(function(error) {
			console.error("Authentication failed:", error);
			$scope.errorMessage = error.message;
		  
		});
	}
});

