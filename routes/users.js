var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/login', function (req, res, next) {
  res.render('login', { title: 'Express' });
});

router.get('/signup', function(req, res, next) {
  res.render('signup', { title: 'Express' });
});

router.get('/farm_reg', function(req, res, next) {
  res.render('farm_reg', { title: 'Express' });
});

router.get('/reserve', function(req, res, next) {
  res.render('reserve', { title: 'Express' });
});

module.exports = router;
