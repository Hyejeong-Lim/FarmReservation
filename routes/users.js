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

router.get('/search_list', function(req, res, next) {
  res.render('search_list', { title: 'Express' });
});

router.get('/farmMypage', function(req, res, next) {
  res.render('./mypage/farmMypage', { title: 'Express' });
});

router.get('/farmMypage_update', function(req, res, next) {
  res.render('./mypage/farmMypage_update', { title: 'Express' });
});

router.get('/userMypage', function(req, res, next) {
  res.render('./mypage/userMypage', { title: 'Express' });
});

router.get('/userMypage_update', function(req, res, next) {
  res.render('./mypage/userMypage_update', { title: 'Express' });
});

router.get('/farmInfo', function(req, res, next) {
  res.render('farmInfo', { title: 'Express' });
});

router.get('/progInfo', function(req, res, next) {
  res.render('ProgInfo', { title: 'Express' });
});

router.get('/progRes', function(req, res, next) {
  res.render('ProgRes', { title: 'Express' });
});
module.exports = router;
