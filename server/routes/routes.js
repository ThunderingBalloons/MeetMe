var User = require('../db/models/user');
var Event = require('../db/models/event');
var Invitee = require('../db/models/invitee');
var config = require('../db/config/config');
var env = config.development;
var flash = require('connect-flash');
var bcrypt = require('bcrypt');
var utils = require('../utils/utils');
var path = require('path');

// db modules
var Sequelize = require('sequelize');
var conString = env.dialect+'://'+env.username+':'+env.password+'@'+env.host+':'+env.port+'/'+env.database;
var sequelize = new Sequelize(conString, {
  dialect: 'postgres',
});

// Yelp.js functions
var searchYelp = require('../utils/yelp');


/////////////////////////////////////////////////////
// configure endpoints //////////////////////////////
/////////////////////////////////////////////////////
module.exports = function(app){

  /////////////////////////
  // root route handling //
  /////////////////////////
  app.route('/')
    .get(utils.checkUser, function(req, res) {
      res.sendfile(path.resolve('client/first.html')); 
  });


  //////////////////////////
  // login route handling //
  //////////////////////////
  app.route('/login')
    .get(function(req,res){
      // Load login component;
      res.render('login');
    })
    .post(function(req,res){

      var username = req.body.username;
      var password = req.body.password;

      sequelize.sync().then(function() {
        User.findOne({
          where:{'username':username}
        })
        .then(function(matchedUser){
          if (!matchedUser) { res.redirect('/'); }
          else {
            bcrypt.compare(password, matchedUser.dataValues.hash, function(err, match) {
              if (match) {
                utils.createSession(req, res, username, matchedUser.dataValues.id);
              } else {
                res.render('login');
              }
            });
          }
        });
      });
    });


  ///////////////////////////
  // signup route handling //
  ///////////////////////////

  // extra route to see if chosen user name exists
  // useful when creating a new profile
  app.route('/signup/users/:username')
    .get(function(req, res){
      sequelize.sync().then(function() {
        User.findOne({
          where:{'username': req.params.username}
        }).then(function(result){
          res.send(200, result ? true : false);
        });
      });
    });

  // main signup route logic  
  app.route('/signup')
    .get(function(req,res){
      // Render signup component
      res.render('signup');
    })
    .post(function(req,res){
      var username = req.body.username;

      // If username exists, throw error
      sequelize.sync().then(function() {
        User.findOne({
          where:{'username':username}
        })
        .then(function(matchedUser){
          if (matchedUser) { 
          res.send(500, "Username " + username + " is already taken."); 
          } else {
            bcrypt.genSalt(10, function(err, salt){
              bcrypt.hash(req.body.password, salt, function(err, hash){
                sequelize.sync().then(function(){
                  return User.create({
                    username: req.body.username,
                    hash: hash,
                    email: req.body.email,
                    latitude: req.body.latitude,
                    longitude: req.body.longitude,
                    createdAt: Date.now()
                  });
                }).then(function(result){
                  console.log('posted user to database');
                  res.redirect(200, "/login");
                })
              })
            });
          }
        });
      });
    });

  ///////////////////////////
  // get request from users //
  ///////////////////////////

  app.route('/users')
   .get(utils.checkUser, function(req, res) {
     User.findAll({
       attributes: ["id", "username", "latitude", "longitude"]
     }).then(function(allUsers){
       res.send(200, allUsers);
     });
   });

  ///////////////////////////
  // get request from yelp //
  ///////////////////////////
  app.route('/places')
    .get(utils.checkUser, function(req, res) {
    console.log('in places route :');
    var term = req.query.term;
    var lat = req.query.lat;
    var lon = req.query.lng;

    searchYelp(term, lat, lon, function(data){
      res.json(data);
    });
  });


  //////////////////
  // logout route //
  //////////////////
  app.route('/logout')
    .get(function(req, res) {
      req.session.destroy(function(){
        console.log("LOGGED OUT!!!");
        res.redirect('/');
      });
    });


  ///////////////////////////
  // event routes handling //
  ///////////////////////////

  app.route('/events')
    .get(utils.checkUser, function(req, res) {
      // query to get all events that current user is attending 
      var query = 'SELECT * FROM invitees, events WHERE (events.id = invitees.eid AND invitees.uid =' + req.session.uid + ')';
      //var query = 'SELECT * FROM invitees, events WHERE (events.id = invitees.eid AND invitees.uid = 1)';
      sequelize.query(query).spread(function(eventsList, metadata){
        eventsList.forEach(function(event, index){
          // query to get the name of all attendees for specific event
          query = 'SELECT users.username FROM invitees, users WHERE (invitees.eid = '+ event.eid + ' AND users.id = invitees.uid)';
          sequelize.query(query).spread(function(attendees, metadata){
            eventsList[index].attendees = attendees;
            if (index === eventsList.length - 1) {
              res.send(200, eventsList);
            }
          });
        });
      });
    }) 
    .post(utils.checkUser, function(req, res) {
       // write all event info into events table
       console.log('in post events route :');
      sequelize.sync().then(function(){
        return Event.create({
          event_name: req.body.event_info.event_name,
          org_id: req.body.event_info.org_id,
          venue_name: req.body.event_info.venue_name,
          street: req.body.event_info.street,
          city: req.body.event_info.city,
          state: req.body.event_info.state,
          event_time: req.body.event_info.event_time,
          latitude: req.body.event_info.latitude,
          longitude: req.body.event_info.longitude,
          phone: req.body.event_info.phone,
          rating: req.body.event_info.rating,
          rating_img: req.body.event_info.rating_img,
          image: req.body.event_info.image,
          yelp_link: req.body.event_info.yelp_link,
          createdAt: Date.now()
        }).then(function(result) {
          // write all invitee info in to invitee table
          if (result){
            req.body.invitees.forEach(function(invitee, index){
              Invitee.create({
                uid: invitee,
                eid: result.id,
                current_status: invitee === result.org_id ? "accepted" : "pending",
                createdAt: Date.now()
              })
              .then(function() {
                if (index === req.body.invitees.length-1) {
                  res.send(200, "wrote all invitees to db");
                }
              });
            });
          } else {
            res.send(500, "unable to write event to db");
          }
        });
      });
    });

    app.route('/invite')
     .put(utils.checkUser, function(req, res) {
      var uid = req.session.uid;
      var eid = req.body.eid;
      var status = req.body.status;

      var query = "UPDATE invitees SET current_status = '" + status + "' WHERE (uid = " + uid + " and eid = " + eid + ")";
      sequelize.query(query).spread(function(updated, metadata){
        if (updated) {
          res.send(200, "Invite updated")
        }
      });
     });

    app.route('/*')
     .get(function(req, res){
      res.redirect('/');
     });
};




