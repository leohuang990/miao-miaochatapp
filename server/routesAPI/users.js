const express = require('express');
const router = express.Router();
const bcript = require('bcrypt');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const secret = require('../config/key').secret;

function ValidateEmail(mail) {
    let mailformat = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    if (mail.match(mailformat)) {
      return true;
    } else {
      return false;
    }
}

router.get('/', (req, res)=>{
    User.find()
    .then(users=>res.json(users))
})

router.get('/all', (req, res)=>{
    User.find()
    .then(users=>{
        return res.json(users.map(user=>user.name)) 
    }).catch(err=>{})
})



// router.get('/temp', (req, res)=>{
//     const name1 = req.body.name1;
//     const name2 = req.body.name2;
//     User.find({name: name1}).then(user=>{
//         user[0].friends.filter(hist=>hist[0]===name2)[0].push("msg");
//         console.log(user[0].friends)
//         User.findOneAndUpdate({name: name1}, {$set:{
//             friends: user[0].friends
//         }}).then(()=>res.json('temp'))
//     }).then(()=>{})
// })

router.post('/', (req, res)=>{
    const email = req.body.email;
    const password = req.body.password;
    const c_password = req.body.confirm;
    const name = req.body.name
    if(!email || !password || !c_password) return res.json({msg: 'Please fill out all fields'})
    if(!ValidateEmail(email)) return res.json({msg: 'Please use valid email address'});
    if(password.length<8) return res.json({msg: 'Your password must be 8 characters or more'});
    if(password!==c_password) return res.json({msg: 'Two passwords mismatch with each other'});
    User.findOne({email})
        .then(user=>{

            if(user) return res.json({msg: 'This email has already been registered'})
            User.findOne({name}).then(user=>{
                if(user) return res.json({msg: 'This name has already been registered'})
                const newUser = new User({
                    name,
                    email,
                    password,
                    icon: ''
                })
                bcript.genSalt(10, (err, salt)=>{
                    bcript.hash(password, salt, (err, hash)=>{
                        if(err) throw err;
                        newUser.password = hash;
                        newUser.save().then(user=>{
                            const token = jwt.sign(
                                {id: user.id},
                                secret,
                                {expiresIn: 3600}
                            )
                            res.json({
                                user,token
                            })
                        })
                    })
                })
            })
        });

    
})

module.exports = router;