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

app.run(['$anchorScroll', function($anchorScroll) {
  $anchorScroll.yOffset = 50;   // always scroll by 50 extra pixels
}])


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
					console.log($scope.listings, "<-- listings");
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

//Filter out previous events to ensure only events with a date in the future are displayed
app.filter('futureDate', function() {
  return function(input) {
    var out = [];
    angular.forEach(input, function(myEvent) {
      if (Date.parse(myEvent.dateOfEvent) > Date.now()) {
        out.push(myEvent)
      }
    })
    return out;
  }
});


app.controller('MainCtrl', function($scope, $q, $firebaseAuth, $firebaseObject, $firebaseArray, $window, $location, $anchorScroll) {

    $scope.authObj = $firebaseAuth();

    $scope.searchEvent = function() {
    	$scope.events = $firebaseArray(firebase.database().ref().child('events'));
    }

    $scope.displayData = function(eventID) {
    	$scope.historicalDataset = [];
    	$scope.currentDataset = [];
    	$scope.daysBetweenCurrDataset = [];
    	$scope.daysBetweenHistDataset = [];
    	var allPromises = [];

    	$scope.myEvent = $firebaseObject(firebase.database().ref().child('events').child(eventID));
    	
    	$scope.myEvent.$loaded().then(function() {
    		$scope.eventName = $scope.myEvent.name;
    		var currEventDate = Date.parse($scope.myEvent.dateOfEvent);
	    	if ($scope.myEvent.previousEvents) {
	    		angular.forEach($scope.myEvent.previousEvents, function(prevID) {
	    			$scope.oldEvent = $firebaseObject(firebase.database().ref().child('events').child(prevID));
	    			$scope.oldEvent.$loaded().then(function() {
	    				$scope.oldEventDate = Date.parse($scope.oldEvent.dateOfEvent);
	    			});
	    			$scope.oldlistings = $firebaseObject(firebase.database().ref().child('listings').child(prevID));
	    			allPromises.push($scope.oldlistings.$loaded().then(function() {
				    	angular.forEach($scope.oldlistings, function(price, date) {
				    		var dateInSec = new Date(parseInt(date));
							$scope.historicalDataset.push({
								date: dateInSec,
								value: price
							});
							var diff =  Math.floor(( $scope.oldEventDate - dateInSec ) / (1000*60*60*24));
							$scope.daysBetweenHistDataset.push({
								days: diff,
								value: price
							})
						});
					}));
	    		});
	    	}

	    	$scope.listings = $firebaseObject(firebase.database().ref().child('listings').child(eventID));
			allPromises.push($scope.listings.$loaded().then(function() {
		    	angular.forEach($scope.listings, function(price, date) {
		    		var dateInSec = new Date(parseInt(date));
					$scope.currentDataset.push({
						date: dateInSec,
						value: price
					});
					var diff =  Math.floor(( $scope.EventDate - dateInSec ) / (1000*60*60*24));
					$scope.daysBetweenCurrDataset.push({
						days: diff,
						value: price
					})
				});
			}));


			return $q.all(allPromises);
	    }).then(function(results) {
	    	console.log($scope.historicalDataset, "historical");
	    	d3.select("svg").remove();
	    	var width = 500;
			var height = 250;    

			// Create the SVG 'canvas'
			var svg = d3.select("#graph")
			    .append("svg")
			    .attr("viewBox", "0 0 " + width + " " + height)


			// get the data
			var dataset = $scope.currentDataset;
			var oldDataset = $scope.historicalDataset;
			var daysDataset = $scope.daysBetweenCurrDataset;
			var oldDaysDataset = $scope.daysBetweenHistDataset;

			console.log(daysDataset, " <--- dataset");
			console.log(oldDaysDataset, " <--- old event dataset");
			// Define the padding around the graph
			var padding = 50;

			// Set the scales
			var minDate = d3.min(dataset, function(d) { return d.date; });
			minDate.setDate(minDate.getDate() - 1);

			var maxDate = d3.max(dataset, function(d) { return d.date; });

			var xScale = d3.time.scale()
			    .domain([minDate, maxDate])
			    .range([padding, width - padding]);

			var yScale = d3.scale.linear()
			    .domain([d3.min(dataset, function(d) { return d.value - 100; }), d3.max(dataset, function(d) { return d.value + 100; })])
			    .range([height - padding, padding]);

			// x-axis
			var format = d3.time.format("%d %b");
			var xAxis = d3.svg.axis()
			    .scale(xScale)
			    .orient("bottom")
			    .tickFormat(format)
			    .ticks(d3.time.days, 1);

			svg.append("g")
			    .attr("class", "axis x-axis")
			    .attr("transform", "translate(0," + (height - padding) + ")")
			    .call(xAxis);

			// y-axis
			var yAxis = d3.svg.axis()
			    .scale(yScale)
			    .orient("left")
			    .tickFormat(function (d) { return d; })
			    .tickSize(5, 5, 0)
			    .ticks(5); // set rough # of ticks

			svg.append("g")
			    .attr("class", "axis y-axis")
			    .attr("transform", "translate(" + padding + ",0)")
			    .call(yAxis);

			// draw line graph
			var line = d3.svg.line()
			    .x(function(d) { 
			        return xScale(d.date); 
			    })
			    .y(function(d) { 
			        return yScale(d.value); 
			    });

			svg.append("svg:path").attr("d", line(dataset));

			// plot circles
			svg.selectAll("circle")
			    .data(dataset)
			    .enter()
			    .append("circle")
			    .attr("class", "data-point")
			    .attr("cx", function(d) {
			        return xScale(d.date);
			    })
			    .attr("cy", function(d) {
			        return yScale(d.value);
			    })
			    .attr("r", 5)
			    .on("mouseover", function(d) {
			    	console.log("hi");
				    d3.select(this).append("text")
				        .text(function(d) {return d.value;})
				        .attr("xScale", xScale(d.date))
				        .attr("yScale", yScale(d.value)); 
				    });
			    
			}).then(function() {
				//allows for auto-scroll
				console.log("scrolling");
				$location.hash('belowGraph');
		  		$anchorScroll();
			})
			
		}
		
		
});

