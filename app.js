const fs = require('fs');
const mysql = require('mysql');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const moment = require('moment');
const FileStore = require('session-file-store')(session); // 세션을 파일에 저장
const { concatSeries, select } = require('async');

// express 설정 1
const app = express();

// db 연결 2
const client = mysql.createConnection({
  user: 'root',
  password: 'gPwjd1025',
  database: 'farm'
});

// 정적 파일 설정 (미들웨어) 3
app.use(express.static(path.join(__dirname, '/public')));

// ejs 설정 4
app.set('views', __dirname + '\\views');
app.set('view engine', 'ejs');
console.log(__dirname);
console.log(path.join(__dirname, '/public'));
// 정제 (미들웨어) 5
app.use(bodyParser.urlencoded({ extended: false }));

// 세션 (미들웨어) 6
app.use(session({
  secret: 'blackzat', // 데이터를 암호화 하기 위해 필요한 옵션
  resave: false, // 요청이 왔을때 세션을 수정하지 않더라도 다시 저장소에 저장되도록
  saveUninitialized: true, // 세션이 필요하면 세션을 실행시칸다(서버에 부담을 줄이기 위해)
  store: new FileStore() // 세션이 데이터를 저장하는 곳
}));

app.get('/', (req, res) => {
  console.log('메인페이지 작동');
  console.log(req.session);
  client.query('select LocalName from localcode', (err, data2) => {
    client.query('select FarmCategoryName from farmcategorycode', (err, data1) => {
      if (req.session.is_logined == true) {
        client.query('select * from login_session', (err, session) => {
          res.render('index', {
            is_logined: req.session.is_logined,
            name: session[0].login_name,
            FarmYN: session[0].login_farm_YN,
            FarmCategoryName: data1,
            LocalName: data2
          });
        });
      } else {
        res.render('index', {
          is_logined: false,
          FarmYN: false,
          FarmCategoryName: data1,
          LocalName: data2
        });
      }
    });
  });
});

// 회원가입
app.get('/register', (req, res) => {
  console.log('회원가입 페이지');
  res.render('register');
});

app.post('/register', (req, res) => {
  console.log('회원가입 하는중')
  const body = req.body;
  const id = body.ID;
  const pw = body.PW;
  const name = body.MemberName;
  const email = body.MemberEmail;
  const phone = body.MemberPhoneNum;
  var farm= body.FarmYN;
  if(body.FarmYN == undefined) {
    farm = 0;
  }

  client.query('select * from member where ID=?', [id], (err, data) => {
    if (data.length == 0) {
      console.log(data);
      console.log('회원가입 성공');
      client.query('insert into member(ID, PW, MemberName, MemberEmail, MemberPhoneNum,FarmYN) values(?,?,?,?,?,?)',
        [id, pw, name, email, phone, farm]);

      res.redirect('/');
    } else {
      console.log('회원가입 실패');
      res.send('<script>alert("회원가입 실패");</script>');
      res.redirect('/login');
    }
  });
});

// 로그인
app.get('/login', (req, res) => {
  console.log('로그인 작동');
  res.render('login');
});

app.post('/login', (req, res) => {
  const body = req.body;
  const id = body.ID;
  const pw = body.PW;
  client.query('select LocalName from localcode', (err, data2) => {
    client.query('select FarmCategoryName from farmcategorycode', (err, data1) => {
      client.query('select * from member where ID=?', [id], (err, data) => {
        if (id == data[0].ID || pw == data[0].PW) {
          client.query('insert into login_session(login_number, login_name, login_farm_YN) values(?,?,?)',
            [
              data[0].ID, data[0].MemberName, data[0].FarmYN
            ]);
          // 세션에 추가
          req.session.is_logined = true;
          req.session.name = data.MemberName;
          req.session.id = data.ID;
          req.session.pw = data.PW;
          req.session.save(function () { // 세션 스토어에 적용하는 작업
            res.render('index', { // 정보전달
              is_logined: true,
              name: data[0].MemberName,
              FarmYN: data[0].FarmYN,
              id: data[0].ID,
              FarmCategoryName: data1,
              LocalName: data2
            });
          });
        } else {
          console.log('로그인 실패');
          res.render('index');
        }
      });
    });
  });
});
// 로그아웃
app.get('/logout', (req, res) => {
  console.log('로그아웃 성공');
  req.session.is_logined == false
  req.session.destroy(function (err) {
    // 세션 파괴후 할 것들
    client.query('delete from login_session');
    res.redirect('/');
  });

});

app.post('/search', (req, res) => {
  var body = req.body;
  console.log(req.session.is_logined)
  client.query('select LocalName from localcode', (err, data2) => {
    client.query('select FarmCategoryName from farmcategorycode', (err, data1) => {
      if (req.session.is_logined == true) {
        client.query('select * from login_session', (err, session) => {
          if (body.category == 0) {
            client.query('select * from farmpost inner join localcode on farmpost.LocalNum=localcode.LocalNum inner join farmcategorycode on farmpost.CategoryNum=farmcategorycode.CategoryNum where farmpost.LocalNum=?', [body.local], (err, data) => {
              if (err) console.log('query is not excuted. select fail...\n' + err);
              else {
                res.render('search.ejs', {
                  list: data,
                  FarmYN: body.FarmYN,
                  FarmCategoryName: data1,
                  LocalName: data2,
                  is_logined: req.session.is_logined,
                  name: session[0].login_name,
                  FarmYN: session[0].login_farm_YN,
                });
              }
            });
          } else if (body.local == 0) {
            client.query('select * from farmpost inner join localcode on farmpost.LocalNum=localcode.LocalNum inner join farmcategorycode on farmpost.CategoryNum=farmcategorycode.CategoryNum where farmpost.CategoryNum=?', [body.category], (err, data) => {
              if (err) console.log('query is not excuted. select fail...\n' + err);
              else res.render('search.ejs', {
                list: data,
                FarmYN: body.FarmYN,
                FarmCategoryName: data1,
                LocalName: data2,
                is_logined: req.session.is_logined,
                name: session[0].login_name,
                FarmYN: session[0].login_farm_YN,
              });
            });
          } else {
            client.query('select * from farmpost inner join localcode on farmpost.LocalNum=localcode.LocalNum inner join farmcategorycode on farmpost.CategoryNum=farmcategorycode.CategoryNum where farmpost.LocalNum=? and farmpost.CategoryNum', [body.local, body.category], (err, data) => {
              if (err) console.log('query is not excuted. select fail...\n' + err);
              else res.render('search.ejs', {
                list: data,
                FarmYN: body.FarmYN,
                FarmCategoryName: data1,
                LocalName: data2,
                is_logined: req.session.is_logined,
                name: session[0].login_name,
                FarmYN: session[0].login_farm_YN,
              });
            });
          }
        });
      } else {
        if (body.category == 0) {
          client.query('select * from farmpost inner join localcode on farmpost.LocalNum=localcode.LocalNum inner join farmcategorycode on farmpost.CategoryNum=farmcategorycode.CategoryNum where farmpost.LocalNum=?', [body.local], (err, data) => {
            if (err) console.log('query is not excuted. select fail...\n' + err);
            else {
              res.render('search.ejs', {
                list: data,
                FarmYN: body.FarmYN,
                FarmCategoryName: data1,
                LocalName: data2,
                is_logined: req.session.is_logined,
                name: null,
                FarmYN: null,
              });
            }
          });
        } else if (body.local == 0) {
          client.query('select * from farmpost inner join localcode on farmpost.LocalNum=localcode.LocalNum inner join farmcategorycode on farmpost.CategoryNum=farmcategorycode.CategoryNum where farmpost.CategoryNum=?', [body.category], (err, data) => {
            if (err) console.log('query is not excuted. select fail...\n' + err);
            else res.render('search.ejs', {
              list: data,
              FarmYN: body.FarmYN,
              FarmCategoryName: data1,
              LocalName: data2,
              is_logined: req.session.is_logined,
              name: null,
              FarmYN: null,
            });
          });
        } else {
          client.query('select * from farmpost inner join localcode on farmpost.LocalNum=localcode.LocalNum inner join farmcategorycode on farmpost.CategoryNum=farmcategorycode.CategoryNum where farmpost.LocalNum=? and farmpost.CategoryNum', [body.local, body.category], (err, data) => {
            if (err) console.log('query is not excuted. select fail...\n' + err);
            else res.render('search.ejs', {
              list: data,
              FarmYN: body.FarmYN,
              FarmCategoryName: data1,
              LocalName: data2,
              is_logined: req.session.is_logined,
              name: null,
              FarmYN: null,
            });
          });
        }
      }
    });
  });
});
app.post('/write', function (req, res) {
  var body = req.body;
  console.log(body.FarmYN);

  if (body.FarmYN == 1) {
    client.query('select LocalName from localcode', (err, data2) => {
      client.query('select FarmCategoryName from farmcategorycode', (err, data1) => {
        if (req.session.is_logined == true) {
          client.query('select * from login_session', (err, session) => {
            console.log("data1", data1);
            res.render('write.ejs', {
              FarmCategoryName: data1,
              LocalName: data2,
              is_logined: req.session.is_logined,
              name: session[0].login_name,
              FarmYN: session[0].login_farm_YN,
            });
          });
        } else {
          res.render('write.ejs', {
            FarmCategoryName: data1,
            LocalName: data2,
            is_logined: req.session.is_logined,
            name: null,
            FarmYN: null
          });
        }
      });
    });

  } else {
    res.render("nope.ejs");
  }
});

app.post('/programWrite', function (req, res) {
  var body = req.body;
  console.log(body);
  console.log('게시글 작성 완료 프로그램 등록 시작');
  client.query('select * from login_session', (err, data) => {
    client.query('insert into farmpost(CategoryNum,LocalNum,ID,FarmName,FarmInfo,FarmAddress,PostDate,PicturePath) values(?,?,?,?,?,?,CURDATE(),?)',
      [
        body.category,body.local,data[0].login_number,body.FarmName,body.FarmInfo,body.FarmAddress,body.PicturePath
      ]);
    client.query('select PostNum from farmpost where ID=? and PostDate=CURDATE()', [data[0].login_number], (err, data1) => {
      if (req.session.is_logined == true) {
        client.query('select * from login_session', (err, session) => {
          console.log("data1", data1[0]);
          res.render('programWrite.ejs', {
            PostNum: data1[0].PostNum,
            is_logined: req.session.is_logined,
            name: session[0].login_name,
            FarmYN: session[0].login_farm_YN,
          });
        });
      } else {
        res.render('programWrite.ejs', {
          PostNum: data1[0].PostNum,
          is_logined: req.session.is_logined,
          name: null,
          FarmYN: null
        });
      }
    });
  });
});

app.post('/programregist', function (req, res) {
  var body = req.body;
  console.log(body);
  client.query('select * from login_session', (err, data) => {

    client.query('insert into program(PostNum,PrgName,PrgPrice,PrgStart,PrgEnd,PrgMax,PrgStartDate,PrgEndDate) values(?,?,?,?,?,?,?,?)',
      [
        body.PostNum, body.PrgName, body.PrgPrice, body.PrgStart, body.PrgEnd, body.PrgMax, body.PrgStartDate, body.PrgEndDate
      ]);

    if (body.button == "작성완료") {
      res.redirect('/');
    } else {
      res.render('programWrite.ejs', {
        PostNum: body.PostNum
      });
    }

  });
});

app.post('/programjoin', function (req, res) {
  var body = req.body;
  console.log(body);
  client.query('select * from program where PrgNum=?',[body.program],(err,data1)=>{
      client.query('select * from login_session',(err,data)=>{
          console.log((parseInt(body.Person)+parseInt(data1[0].PrgSub)));
          if((parseInt(body.Person)+parseInt(data1[0].PrgSub))<=data1[0].PrgMax){
              if ((moment(body.selectedDate, "YYYY-MM-DD")).isBefore(moment(data1[0].PrgEndDATE,"YYYY-MM-DD"))&&(moment(body.selectedDate, "YYYY-MM-DD")).isSameOrAfter(moment(data1[0].PrgStartDATE,"YYYY-MM-DD"))){
                  client.query('insert into programjoinlist(RsvID,PrgNum,PostNum,Date,Person,PriceSum) values(?,?,?,?,?,?)',
                  [
                      data[0].login_number,body.program,body.PostNum,body.selectedDate,body.Person,parseInt(data1[0].PrgPrice)*body.Person
                  ]);
                  client.query('update program set PrgSub=? where PrgNum=?',
                  [(parseInt(body.Person)+parseInt(data1[0].PrgSub)),body.program]
                  );
                  res.redirect('/');
              
              }else{
                  console.log("신청 불가 날짜");
                  console.log("x");
              }
          }else{
              console.log("인원수 꽉참");
              console.log("x");
          }
          });
      });
  });

app.get('/mypage', (req, res) => {
  console.log('마이페이지');
    var sql = 'SELECT * FROM login_session';    
    client.query(sql, function (err, rows, fields) {
        console.log(rows);
        if(err) console.log('query is not excuted. select fail...\n' + err);
        else {
            console.log(rows[0].login_number);
            client.query('select * from member where ID=?',[rows[0].login_number],(err,data1)=>{
                console.log("data1",data1);
                console.log('data1[0].ID',data1[0].ID);
                console.log('data1[0].YN',data1[0].FarmYN);
                if (data1[0].FarmYN==1){
                    client.query('select * from programjoinlist inner join farmpost on programjoinlist.PostNum=farmpost.PostNum inner join program on programjoinlist.PrgNum=program.PrgNum  where ID = ?',[rows[0].login_number],(err,data2)=>{
                      if (req.session.is_logined == true) {
                        client.query('select * from login_session', (err, session) => {
                          console.log("data2213123",data2);
                          res.render('mypage.ejs', 
                          {   
                              list : data1,
                              list1 : data2,
                              is_logined: req.session.is_logined,
                              name: session[0].login_name,
                              FarmYN: session[0].login_farm_YN,
                          });
                        });
                      } else {
                        res.render('mypage.ejs', 
                        {   
                          list : data1,
                          list1 : data2,
                          is_logined: req.session.is_logined,
                          name: null,
                          FarmYN: null
                        });
                      }
                    });
                }else{
                    console.log(data1);
                    console.log(data1[0].ID);
                    client.query('select * from programjoinlist inner join program on programjoinlist.PrgNum=program.PrgNum where RsvID = ?',[rows[0].login_number],(err,data2)=>{
                      if (req.session.is_logined == true) {
                        client.query('select * from login_session', (err, session) => {
                          console.log("data2",data2);
                          res.render('mypage.ejs', 
                          {   
                              list : data1,
                              list1 : data2,
                              is_logined: req.session.is_logined,
                              name: null,
                              FarmYN: null
                          });
                        });
                      }
                    });
                    }
                });
            }    
        });
});

app.post('/Infochange', (req, res)=>{
  var body= req.body;
  console.log(body);
  console.log("구분용"); 
  client.query('update member set PW=?, MemberPhoneNum=?, MemberEmail=? where ID=?',
  [body.PW,body.MemberPhoneNum,body.MemberEmail,body.ID]
  );
  var sql = 'SELECT * FROM login_session';    
  client.query(sql, function (err, rows, fields) {
      console.log(rows);
      if(err) console.log('query is not excuted. select fail...\n' + err);
      else {
          console.log(rows[0].login_number);
          client.query('select * from member where ID=?',[rows[0].login_number],(err,data1)=>{
              console.log(data1);
              console.log(data1[0].ID);
              client.query('select * from programjoinlist inner join program on programjoinlist.PrgNum=program.PrgNum where RsvID = ?',[rows[0].login_number],(err,data2)=>{
                  console.log(data2);
                  res.render('mypage.ejs',
                  {   
                      list : data1,
                      list1 : data2
                  });
              });
          });
      }
  });
});

app.post('/farmdetail', (req, res) => {
  console.log('농장상세보기');
  var body = req.body;
  console.log(body);
  console.log(body.PostNum);
  client.query('select * from farmpost inner join program on farmpost.PostNum=program.PostNum where farmpost.PostNum=?', [body.PostNum], (err, data1) => {
    if (req.session.is_logined == true) {
      client.query('select * from login_session', (err, session) => {
          console.log("data1:", data1);
          res.render('farmdetail.ejs',
          {
            list: data1,
            is_logined: req.session.is_logined,
            name: session[0].login_name,
            FarmYN: session[0].login_farm_YN,
          });
        
      });
    } else {
      res.render('farmdetail.ejs',
      {
        list: data1,
        is_logined: req.session.is_logined,
        name: null,
        FarmYN: null,
      });
    }
  });
});

app.post('/delete', (req, res)=>{
  var body= req.body;
  console.log('body',body);
  console.log('body.RsvNum',body.RsvNum);
  console.log("예약삭제")
  
  client.query('select * from program where PrgNum=?',[body.PrgNum],(err,data)=>{
      console.log('data[0]',data[0]);
      
      client.query('update program set PrgSub=? where PrgNum=?',
      [(parseInt(data[0].PrgSub) - body.Person),body.PrgNum]
          );
          client.query('delete from programjoinlist where RsvNum=?',[body.RsvNum]);
      res.redirect('/');
  });
});

app.listen(3000, () => {
  console.log('3000 port running...');
});