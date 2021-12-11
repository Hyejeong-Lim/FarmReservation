const fs = require('fs');
const mysql = require('mysql');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const moment = require('moment');
const FileStore = require('session-file-store')(session); // 세션을 파일에 저장
const { concatSeries, select } = require('async');
const { list } = require('session-file-store/lib/session-file-helpers');
const { route } = require('express/lib/application');
javascriptkey = '8e4c599cb73586b521359d6f3dbdb55b';

// express 설정 1
const app = express();

// db 연결 2
const client = mysql.createConnection({
  user: 'root',
  password: '',
  database: 'farm'
});

// 정적 파일 설정 (미들웨어) 3
app.use(express.static(path.join(__dirname, '/public')));

// ejs 설정 4
app.set('views', __dirname + '\\views');
app.set('view engine', 'ejs');
// 정제 (미들웨어) 5
app.use(bodyParser.urlencoded({ extended: false }));

// 세션 (미들웨어) 6
app.use(session({
  secret: 'blackzat', // 데이터를 암호화 하기 위해 필요한 옵션
  resave: false, // 요청이 왔을때 세션을 수정하지 않더라도 다시 저장소에 저장되도록
  saveUninitialized: true, // 세션이 필요하면 세션을 실행시칸다(서버에 부담을 줄이기 위해)
  store: new FileStore() // 세션이 데이터를 저장하는 곳
}));

// 파일저장
var multer = require('multer')

//파일 저장위치와 파일이름 설정
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    //파일이 이미지 파일이면
    if (file.mimetype == "image/jpeg" || file.mimetype == "image/jpg" || file.mimetype == "image/png") {
      console.log("이미지 파일이네요")
      cb(null, 'public/images')
    //텍스트 파일이면
    } else if (file.mimetype == "application/pdf" || file.mimetype == "application/txt" || file.mimetype == "application/octet-stream") {
      console.log("텍스트 파일이네요")
      cb(null, 'public/texts')
    }
  },
  //파일이름 설정
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname)
  }

})
//파일 업로드 모듈
var upload = multer({ storage: storage })

app.get('/', (req, res) => {
  client.query('select LocalName from localcode', (err, data2) => {
    client.query('select FarmCategoryName from farmcategorycode', (err, data1) => {
      if (req.session.is_logined == true) {
        client.query('select * from login_session', (err, session) => {
          client.query('select * from farmpost', (err, data) => {
            res.render('index', {
              list: data,
              is_logined: req.session.is_logined,
              name: session[0].login_name,
              FarmYN: session[0].login_farm_YN,
              FarmCategoryName: data1,
              LocalName: data2
            });
          })
        });
      } else {
        client.query('select * from farmpost', (err, data) => {
          res.render('index', {
            list: data,
            is_logined: false,
            FarmYN: false,
            FarmCategoryName: data1,
            LocalName: data2,
            javascriptkey: process.env.javascriptkey
          });
        })
      }
    });
  });
});

// 회원가입
app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', (req, res) => {
  const body = req.body;
  const id = body.ID;
  const pw = body.PW;
  const name = body.MemberName;
  const email = body.MemberEmail;
  const phone = body.MemberPhoneNum;
  var farm = body.FarmYN;
  if (body.FarmYN == undefined) {
    farm = 0;
  }

  client.query('select * from member where ID=?', [id], (err, data) => {
    if (data.length == 0) {
      client.query('insert into member(ID, PW, MemberName, MemberEmail, MemberPhoneNum,FarmYN) values(?,?,?,?,?,?)',
        [id, pw, name, email, phone, farm]);

      res.redirect('/');
    } else {
      res.send('<script>alert("회원가입 실패");</script>');
      res.redirect('/login');
    }
  });
});

// 로그인
app.get('/login', (req, res) => {
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
            client.query('select * from farmpost', (err, data3) => {
              res.render('index', { // 정보전달
                list: data3,
                is_logined: true,
                name: data[0].MemberName,
                FarmYN: data[0].FarmYN,
                id: data[0].ID,
                FarmCategoryName: data1,
                LocalName: data2
              });
            })
          });
        } else {
          res.render('index');
        }
      });
    });
  });
});
// 로그아웃
app.get('/logout', (req, res) => {
  req.session.is_logined == false
  req.session.destroy(function (err) {
    // 세션 파괴후 할 것들
    client.query('delete from login_session');
    res.redirect('/');
  });

});

app.post('/search', (req, res) => {
  var body = req.body;
  client.query('select LocalName from localcode', (err, data2) => {
    client.query('select FarmCategoryName from farmcategorycode', (err, data1) => {
      if (req.session.is_logined == true) {
        client.query('select * from login_session', (err, session) => {
          if (body.category == 0) {
            client.query('select * from farmpost inner join localcode on farmpost.LocalName=localcode.LocalName inner join farmcategorycode on farmpost.CategoryName=farmcategorycode.FarmCategoryName where farmpost.LocalName=?', [body.local], (err, data) => {
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
            client.query('select * from farmpost inner join localcode on farmpost.LocalName=localcode.LocalName inner join farmcategorycode on farmpost.CategoryName=farmcategorycode.FarmCategoryName where farmpost.CategoryName=?', [body.category], (err, data) => {
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
            client.query('select * from farmpost inner join localcode on farmpost.LocalName=localcode.LocalName inner join farmcategorycode on farmpost.CategoryName=farmcategorycode.FarmCategoryName where farmpost.LocalName=? and farmpost.CategoryName=?', [body.local, body.category], (err, data) => {
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
          client.query('select * from farmpost inner join localcode on farmpost.LocalName=localcode.LocalName inner join farmcategorycode on farmpost.CategoryName=farmcategorycode.FarmCategoryName where farmpost.LocalName=?', [body.local], (err, data) => {
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
          client.query('select * from farmpost inner join localcode on farmpost.LocalName=localcode.LocalName inner join farmcategorycode on farmpost.CategoryName=farmcategorycode.FarmCategoryName where farmpost.CategoryName=?', [body.category], (err, data) => {
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
          client.query('select * from farmpost inner join localcode on farmpost.LocalName=localcode.LocalName inner join farmcategorycode on farmpost.CategoryName=farmcategorycode.FarmCategoryName where farmpost.LocalName=? and farmpost.CategoryName', [body.local, body.category], (err, data) => {
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
    client.query('select LocalName from localcode', (err, data2) => {
      client.query('select FarmCategoryName from farmcategorycode', (err, data1) => {
        if (req.session.is_logined == true) {
          client.query('select * from login_session', (err, session) => {
            client.query('select * from farmpost where ID=?', [session[0].login_number], (err, farmpost) => {
              if(farmpost.length === 0) {
                res.render('write.ejs', {
                  FarmCategoryName: data1,
                  LocalName: data2,
                  is_logined: req.session.is_logined,
                  name: session[0].login_name,
                  FarmYN: session[0].login_farm_YN,
                  ID: session[0].login_number
                });
              } else {
                res.send(`<script>alert('등록된 농장이 있습니다.');</script>`)
              }
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
});

app.post('/programjoin', function (req, res) {
  var body = req.body;
  client.query('select * from program where PrgNum=?', [body.program], (err, data1) => {
    client.query('select * from login_session', (err, data) => {
      if ((parseInt(body.Person) + parseInt(data1[0].PrgSub)) <= data1[0].PrgMax) {
        if ((moment(body.selectedDate, "YYYY-MM-DD")).isBefore(moment(data1[0].PrgEndDATE, "YYYY-MM-DD")) && (moment(body.selectedDate, "YYYY-MM-DD")).isSameOrAfter(moment(data1[0].PrgStartDATE, "YYYY-MM-DD"))) {
          client.query('insert into programjoinlist(RsvID,PrgNum,PostNum,Date,Time,Person,PriceSum,CardName,CardNum,CardPw) values(?,?,?,?,?,?,?,?,?,?)',
            [
              data[0].login_number, body.program, body.PostNum, body.selectedDate, body.selectedTime, body.Person, parseInt(data1[0].PrgPrice) * body.Person, body.CardName, body.CardNum, body.CardPw
            ]);
          client.query('update program set PrgSub=? where PrgNum=?',
            [(parseInt(body.Person) + parseInt(data1[0].PrgSub)), body.program]
          );
          res.redirect('/');

        } else {
          console.log("신청 불가 날짜");
          console.log("x");
        }
      } else {
        console.log("인원수 꽉참");
        console.log("x");
      }
    });
  });
});

app.get('/mypage', (req, res) => {
  var sql = 'SELECT * FROM login_session';
  client.query(sql, function (err, rows, fields) {
    if (err) console.log('query is not excuted. select fail...\n' + err);
    else {
      client.query('select * from member where ID=?', [rows[0].login_number], (err, data1) => {
        if (data1[0].FarmYN == 1) {
          client.query('select * from programjoinlist inner join farmpost on programjoinlist.PostNum=farmpost.PostNum inner join program on programjoinlist.PrgNum=program.PrgNum  where ID = ?', [rows[0].login_number], (err, data2) => {
            if (req.session.is_logined == true) {
              client.query('select * from login_session', (err, session) => {
                res.render('mypage.ejs',
                  {
                    list: data1,//회원정보
                    list1: data2,//예약신청받은 프로그램 리스트
                    is_logined: req.session.is_logined,
                    name: session[0].login_name,
                    FarmYN: session[0].login_farm_YN,
                  });
              });
            } else {
              res.render('mypage.ejs',
                {
                  list: data1,
                  list1: data2,
                  is_logined: req.session.is_logined,
                  name: null,
                  FarmYN: null
                });
            }
          });
        } else {
          client.query('select * from programjoinlist inner join program on programjoinlist.PrgNum=program.PrgNum where RsvID = ?', [rows[0].login_number], (err, data2) => {
            if (req.session.is_logined == true) {
              client.query('select * from login_session', (err, session) => {
                res.render('mypage.ejs',
                  {
                    list: data1,
                    list1: data2,//회원이 신청한 예약 리스트
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

app.post('/Infochange', (req, res) => {
  var body = req.body;
  console.log(body)
  client.query('update member set PW=?, MemberPhoneNum=?, MemberEmail=? where ID=?',
    [body.PW, body.MemberPhoneNum, body.MemberEmail, body.ID]
  );
  var sql = 'SELECT * FROM login_session';
  client.query(sql, function (err, rows, fields) {
    if (err) console.log('query is not excuted. select fail...\n' + err);
    else {
      client.query('select * from member where ID=?', [rows[0].login_number], (err, data1) => {
        client.query('select * from programjoinlist inner join program on programjoinlist.PrgNum=program.PrgNum where RsvID = ?', [rows[0].login_number], (err, data2) => {
          res.render('mypage.ejs',
            {
              FarmYN: data1[0].FarmYN,
              name: data1[0].MemberName,
              is_logined: req.session.is_logined,
              list: data1,
              list1: data2
            });
        });
      });
    }
  });
});

app.post('/farmdetail', (req, res) => {
  var body = req.body;
  client.query('select * from farmpost where PostNum=?', [body.PostNum], (err, data) => {
    if(data.length != 0) {
      client.query('select * from program where PostNum=?', [body.PostNum], (err, data1) => {
        if (req.session.is_logined == true) {
          client.query('select * from login_session', (err, session) => {
            res.render('farmdetail.ejs',
              {
                farm: data,
                prog: data1,
                is_logined: req.session.is_logined,
                name: session[0].login_name,
                FarmYN: session[0].login_farm_YN
              });
          });
        } else {
          res.render('farmdetail.ejs',
          {
            farm: data,
            prog: data1,
            is_logined: req.session.is_logined,
            name: null,
            FarmYN: null
          });
        }
      });
    }
  });
});

app.post('/farmInfo', upload.single('fileupload'), (req, res) => {         
  var body = req.body;
  console.log(body)
  if(body.FarmName != undefined) {
    client.query('insert into farmpost(CategoryName,LocalName,ID,FarmName,FarmInfo,FarmAddress,PostDate,fileupload) values(?,?,?,?,?,?,CURDATE(),?)',
          [body.category, body.local, body.ID, body.FarmName, body.FarmInfo, body.FarmAddress, req.file.originalname]);
  }
  client.query('select * from farmpost where ID=?', [body.ID], (err, data) => {
    if (data.length != 0) {
      client.query('select * from program where PostNum=?', [data[0].PostNum], (err, data1) => {
        for (var i = 0; i < data1.length; i++) {
          data1[i].PrgStartDATE = data1[i].PrgStartDATE.toString().slice(0, 9)
          data1[i].PrgEndDATE = data1[i].PrgEndDATE.toString().slice(0, 9)
        }
        if (req.session.is_logined == true) {
          client.query('select * from login_session', (err, session) => {
            res.render('farminfo.ejs',
              {
                farmpost: data,
                program: data1,
                is_logined: req.session.is_logined,
                name: session[0].login_name,
                FarmYN: session[0].login_farm_YN,
              });
          });
        } else {
          res.render('farminfo.ejs',
            {
              farmpost: data,
              program: data1,
              is_logined: req.session.is_logined,
              name: null,
              FarmYN: null,
            });
        }
      });
    } else {
      res.send(`<script>alert('등록된 농장이 없습니다.');</script>`)
    }
  });
});

app.get('/programRegist', function (req, res, next) {
  var postNum = req.query.PostNum
  if (req.session.is_logined == true) {
    client.query('select * from login_session', (err, session) => {
      res.render('programRegist', {
        postNum: postNum,
        is_logined: req.session.is_logined,
        name: session[0].login_name,
        FarmYN: session[0].login_farm_YN,
        ID: session[0].login_number
      });
    });
  }
});

app.post('/programRegist', function (req, res) {
  var body = req.body;
  client.query('insert into program(PostNum,PrgName,PrgPrice,PrgStart,PrgEnd,PrgMax,PrgStartDate,PrgEndDate) values(?,?,?,?,?,?,?,?)',
    [body.PostNum, body.PrgName, body.PrgPrice, body.PrgStart, body.PrgEnd, body.PrgMax, body.PrgStartDate, body.PrgEndDate]);
  client.query('select * from farmpost where ID=?', [body.ID], (err, data) => {
    client.query('select * from program where PostNum=?', [body.PostNum], (err, data1) => {
      for (var i = 0; i < data1.length; i++) {
        data1[i].PrgStartDATE = data1[i].PrgStartDATE.toString().slice(0, 9)
        data1[i].PrgEndDATE = data1[i].PrgEndDATE.toString().slice(0, 9)
      }
      if (req.session.is_logined == true) {
        client.query('select * from login_session', (err, session) => {
          res.render('farminfo.ejs',
            {
              farmpost: data,
              program: data1,
              is_logined: req.session.is_logined,
              name: session[0].login_name,
              FarmYN: session[0].login_farm_YN,
            });
        });
      } else {
        res.render('farminfo.ejs',
        {
          farmpost: data,
          program: data1,
          is_logined: req.session.is_logined,
          name: null,
          FarmYN: null,
        });
      }
    });
  });
});

app.post('/deletePrg', function (req, res) {
  var body = req.body;
  console.log(body)
  client.query('select * from login_session', (err, data) => {
    client.query('delete from program where PrgNum=?', [body.PrgNum]);
    client.query('select * from farmpost inner join program on farmpost.PostNum=program.PostNum where ID=?', [data[0].login_number], (err, data1) => {
      client.query('select * from farmpost where ID=?', [data[0].login_number], (err, data2) => {
        if (body.button == "작성완료") {
          res.redirect('/');
        } else {
          res.render('farmInfo.ejs', {
            is_logined: req.session.is_logined,
            FarmYN: data[0].FarmYN,
            PostNum: body.PostNum,
            list: data1,
            list1: data2[0]
          });
        }
      });
    });
  });
});

app.post('/changePrg', function (req, res) {//수정버튼이지만 아직 삭제버튼과 같은기능.
  var body = req.body;
  client.query('select * from login_session', (err, data) => {
    client.query('delete from program where PrgNum=?', [body.PrgNum]);
    client.query('select * from farmpost inner join program on farmpost.PostNum=program.PostNum where ID=?', [data[0].login_number], (err, data1) => {
      if (body.button == "작성완료") {
        res.redirect('/');
      } else {
        res.render('farmInfo.ejs', {
          is_logined: req.session.is_logined,
          FarmYN: data[0].FarmYN,
          PostNum: body.PostNum,
          list: data1
        });
      }
    });
  });
});

app.post('/delete', (req, res) => {
  var body = req.body;

  client.query('select * from program where PrgNum=?', [body.PrgNum], (err, data) => {

    client.query('update program set PrgSub=? where PrgNum=?',
      [(parseInt(data[0].PrgSub) - body.Person), body.PrgNum]
    );
    client.query('delete from programjoinlist where RsvNum=?', [body.RsvNum]);
    res.redirect('/');
  });
});

app.listen(3000, () => {
  console.log('3000 port running...');
});