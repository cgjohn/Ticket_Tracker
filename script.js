var app = angular.module('ticketApp', ['ngRoute', 'firebase']); 

app.run(["$rootScope", "$location", function($rootScope, $location) {
  $rootScope.$on("$routeChangeError", function(event, next, previous, error) {
    // We can catch the error thrown when the $requireSignIn promise is rejected
    // and redirect the user back to the home page
    if (error === "AUTH_REQUIRED") {
      $location.path("/");
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

	$routeProvider.when('/main', {
		controller: 'MainCtrl',
		templateUrl: 'templates/main.html',
		resolve: {
      		"currentAuth": function($firebaseAuth) {
	        return $firebaseAuth().$requireSignIn();
      		}
  		}	
	})

});

app.controller('HomeCtrl', function($scope, $http, $firebaseAuth, $firebaseObject, $firebaseArray, $window) {
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

	$scope.update = function() {
		$scope.eventIDs = []
		$scope.events = $firebaseArray(firebase.database().ref().child('events'));
		$scope.events.$loaded().then(function(){
	        angular.forEach($scope.events, function(eventID) {
	        	$scope.eventIDs.push(eventID);
	      	});
	      	updateListing($scope.eventIDs);
	    });
	};

	var updateListing = function(eventIDs) {
		if (eventIDs.length === 0) {
			return;
		}

		var eventID = eventIDs.splice(0, 1)[0];

	    if (Date.parse(eventID.dateOfEvent) > Date.now()) {
        	$http({
				url: "https://api.stubhub.com/search/inventory/v1",
				method: "GET",
				headers: {'Authorization': "Bearer iqzOnUo98P2SGazfIz0oQ227Wnoa"},
				params: {
					'eventid': eventID.$id,
					'pricingsummary': true
				}
			}).then(function(response) {
				$scope.listings = $firebaseObject(firebase.database().ref().child('listings').child(eventID.$id));
				$scope.listings.$loaded().then(function() {
					console.log($scope.listings);
					console.log(response.data.pricingSummary.averageTicketPrice)
					$scope.listings[Date.now()] = response.data.pricingSummary.averageTicketPrice;
					$scope.listings.$save();
					updateListing(eventIDs);
				});
			});
	    } else {
	    	updateListing(eventIDs);
	    };
	}

	$scope.getData = function (eventID) {
		$scope.dates = [];
		$scope.prices = [];
		$scope.listings = $firebaseObject(firebase.database().ref().child('listings').child(eventID));
		$scope.listings.$loaded().then(function() {
			console.log($scope.listings);
			angular.forEach($scope.listings, function(price, date) {
				$scope.dates.push(new Date(parseInt(date)));
				$scope.prices.push(price);
			});
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
			$window.location.href = '#/main';
		}).catch(function(error) {
			console.error("Authentication failed:", error);
			$scope.errorMessage = error.message;
		  
		});
	}
});

app.controller('MainCtrl', function($scope, $firebaseAuth, $firebaseObject, $window) {
    $scope.authObj = $firebaseAuth();

 
    var svg = dimple.newSvg("body", 800, 600);
    var data = [
      { "Word":"Hello", "Awesomeness":2000 },
      { "Word":"World", "Awesomeness":3000 }
    ];
    var chart = new dimple.chart(svg, data);
    chart.addCategoryAxis("x", "Word");
    chart.addMeasureAxis("y", "Awesomeness");
    chart.addSeries(null, dimple.plot.bar);
    chart.draw();

	
});

