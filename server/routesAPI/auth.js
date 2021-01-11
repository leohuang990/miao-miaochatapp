const express = require('express');
const router = express.Router();
const bcript = require('bcrypt');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const secret = require('../config/key').secret;


router.post('/', (req, res)=>{
    const email = req.body.email;
    const password = req.body.password;
    if(!email || !password ) return res.json({msg: 'Please fill out all fields'})

    User.findOne({email})
        .then(user=>{
            if(!user) return res.json({msg: 'User does not exist'})
            bcript.compare(password, user.password)
            .then(isMatch=>{
                if(!isMatch) return res.json({msg: 'Wrong password'});
                const token = jwt.sign(
                    {id: user.id},
                    secret,
                    {expiresIn: 3600}
                )
                res.json({
                    user,token
                })
            })
        });

    
})

module.exports = router;