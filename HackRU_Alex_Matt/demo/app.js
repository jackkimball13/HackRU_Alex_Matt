// require dependencies for the application
var twilio = require('twilio');
var express = require('express');
var bodyParser = require('body-parser');
var watson = require('watson-developer-cloud');

// Create a simple Express web app that will parse incoming POST bodies
var app = express();
app.use(bodyParser.urlencoded({ extended: true }));
 
// Create a route to render the home page
app.get('/', function(request, response) {
    response.render('index.jade');
});
 
// Create a route that will handle the form submission
app.post('/send', function(request, response) {
    // to send a message, we need a Twilio REST client - we create one here,
    // initializing with our Twilio account credentials. I am loading them here
    // from system environment variables, accessible through the "process.env"
    // global object in Node
    console.log("message called")    
    process.env.TWILIO_ACCOUNT_SID="AC3e52e117c3f1ba18db730572e17a5eea";
    process.env.TWILIO_AUTH_TOKEN="80818633d28eb40bf2f49e3c907ebfd5";
    process.env.TWILIO_NUMBER="+17326246140";
    var client = new twilio.RestClient(process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN);
    // Now, get the parameters POSTed from our form:
    var toNumber = request.body.phone;
    var message = request.body.message;
    var mediaUrl = request.body.url;
 
    // Now let's send the message!
    client.sendMessage({
        to: toNumber,
        body: message,
        mediaUrl: mediaUrl,
        // This is the MMS-enabled number you purchased previously
        from: process.env.TWILIO_NUMBER
    }, function(err, messageData) {
        if (err) {
            response.send('Oops, there was an error :(');
            console.error(err);
        } else {
            response.send('Message sent! SID: ' + messageData.sid);
        }
    });
});

app.post('/message', function(request, response) {
    // create a TwiML response object. This object helps us generate an XML
    // string that we will ultimately return as the result of this HTTP request
    var language_translation = watson.language_translation( {
        url: "https://gateway.watsonplatform.net/language-translation/api",
        password: "GFkuSxjVvVJd",
        username: "42f3c6b0-b262-4aec-a8d4-45866e304559",
        version: 'v2'
    });

    var req = request.body.Body;
    var hasTarget = false;
    var hasSource = false;
    var tar;
    // make regexs for the source and Target language inputs in tex messages 
    var reg1 = new RegExp("(Target:en|Target:es|Target:fr|Target:ara)",'i');
    var reg2 = new RegExp("(Source:en|Source:es|Source:fr|Source:ara)",'i');

    var matchesTarget = req.match(reg1);
    try {
        if(matchesTarget.length > 0) {
            hasTarget = true;
            tar = matchesTarget[0];
            tar = matchesTarget[0].slice(7, matchesTarget[0].length);                    
           // console.log(tar); // for debugging
        }  
    } catch(err) { // null list 
        var twiml = new twilio.TwimlResponse();
        twiml.message(function() {
                    // Watson uses ISO 639-1 expect arabic and egyptian 639-3            
                    this.body("Include target to translate to 'Target:{langCode=en,es,fr,ara}'");
                });
        response.type('text/xml');
        response.send(twiml.toString());
    }
    if(hasTarget) {
        var matchesSource = req.match(reg2);
        var src;
        try {
            if (matchesSource.length > 0) {
                hasSource = true;
                src = matchesSource[0];
                src = matchesSource[0].slice(7, matchesSource[0].length);            
               // console.log(src); // for debugging
            }    
        } catch(err) { // null list
            // Use Watson to Identify language
            var req = req.replace(reg1, "");
            var twiml = new twilio.TwimlResponse();             
            language_translation.identify({ text: req },
                function(err, identifiedLanguages) {
                    if (err)
                        console.log(err)
                    else {
                        var identifiedStringfy = JSON.stringify(identifiedLanguages);
                        // console.log(identifiedStringfy);  // for debugging selected language                      
                        var identifiedSplit = identifiedStringfy.split(",");
                        var identifiedDoubleSplit = identifiedSplit[0].split(":");
                        var identifiedFinal = identifiedDoubleSplit[2].slice(1, identifiedDoubleSplit[2].length -1);
                        language_translation.translate({
                            text: req,
                            source: identifiedFinal,
                            target: tar
                        }, function(err, translation) {
                        if (err)
                            console.log(err)
                        else {
                            //Get translation out of json object
                            var tansStringfy = JSON.stringify(translation);
                            var transSplit = tansStringfy.split(",");
                            var transDoubleSplit = transSplit[0].split(":");
                            var transFinal = transDoubleSplit[2].slice(1, transDoubleSplit[2].length -3);
                            // prepare the TwiML response 
                            twiml.message(function() {
                                this.body("No source language selected, "+identifiedFinal +" detected: "+transFinal);
                            });
                            // Render an XML response
                            response.type('text/xml');
                            response.send(twiml.toString());
                         }
                    }); 
                }
            });     
        }
        if(hasSource) {
            // strip message  source inputs
            var req = req.replace(reg1, "");            
            // console.log("req" + req);  // for debugging
            req = req.replace(reg2,"");
            // console.log("striped: "+req); // for debugging       
            var twiml = new twilio.TwimlResponse();
           // console.log("src: "+src+" tar: "+tar); //for debugging
            // Use Watson to translate language
            language_translation.translate({
                text: req,
                source: src,
                target: tar
            }, function(err, translation) {
                if (err)
                    console.log(err)
                else {
                    //Get translation out of json object
                    var tansStringfy = JSON.stringify(translation);
                    var transSplit = tansStringfy.split(",");
                    var transDoubleSplit = transSplit[0].split(":");
                    var transFinal = transDoubleSplit[2].slice(1, transDoubleSplit[2].length -3);
                    // prepare the TwiML response 
                    // console.log("final:"+transFinal); // for debugging
                    twiml.message(function() {
                        this.body(transFinal);
                    });
                    // Render an XML response
                    response.type('text/xml');
                    response.send(twiml.toString());
                }
            }); 
        }         
    }
});

app.post('/', function(request, response) {
    // create a TwiML response object. This object helps us generate an XML
    // string that we will ultimately return as the result of this HTTP request
    var language_translation = watson.language_translation( {
        url: "https://gateway.watsonplatform.net/language-translation/api",
        password: "GFkuSxjVvVJd",
        username: "42f3c6b0-b262-4aec-a8d4-45866e304559",
        version: 'v2'
    });

    var req = request.body.Body;
    var hasTarget = false;
    var hasSource = false;
    var tar;
    // make regexs for the source and Target language inputs in tex messages 
    var reg1 = new RegExp("(Target:en|Target:es|Target:fr|Target:ara)",'i');
    var reg2 = new RegExp("(Source:en|Source:es|Source:fr|Source:ara)",'i');

    var matchesTarget = req.match(reg1);
    try {
        if(matchesTarget.length > 0) {
            hasTarget = true;
            tar = matchesTarget[0];
            tar = matchesTarget[0].slice(7, matchesTarget[0].length);                    
           // console.log(tar); // for debugging
        }  
    } catch(err) { // null list 
        var twiml = new twilio.TwimlResponse();
        twiml.message(function() {
                // Watson uses ISO 639-1 expect arabic and egyptian 639-3            
                    this.body("Include target to translate to 'Target:{langCode=en,es,fr,ara}'");
                });
        response.type('text/xml');
        response.send(twiml.toString());
    }
    if(hasTarget) {
        var matchesSource = req.match(reg2);
        var src;
        try {
            if (matchesSource.length > 0) {
                hasSource = true;
                src = matchesSource[0];
                src = matchesSource[0].slice(7, matchesSource[0].length);            
               // console.log(src); // for debugging
            }    
        } catch(err) { // null list
            // Use Watson to Identify language
            var req = req.replace(reg1, "");
            var twiml = new twilio.TwimlResponse();             
            language_translation.identify({ text: req },
                function(err, identifiedLanguages) {
                    if (err)
                        console.log(err)
                    else {
                        var identifiedStringfy = JSON.stringify(identifiedLanguages);
                        // console.log(identifiedStringfy);  // for debugging selected language                      
                        var identifiedSplit = identifiedStringfy.split(",");
                        var identifiedDoubleSplit = identifiedSplit[0].split(":");
                        var identifiedFinal = identifiedDoubleSplit[2].slice(1, identifiedDoubleSplit[2].length -1);
                        language_translation.translate({
                            text: req,
                            source: identifiedFinal,
                            target: tar
                        }, function(err, translation) {
                        if (err)
                            console.log(err)
                        else {
                            //Get translation out of json object
                            var tansStringfy = JSON.stringify(translation);
                            var transSplit = tansStringfy.split(",");
                            var transDoubleSplit = transSplit[0].split(":");
                            var transFinal = transDoubleSplit[2].slice(1, transDoubleSplit[2].length -3);
                            // prepare the TwiML response 
                            twiml.message(function() {
                                this.body("No source language selected, "+identifiedFinal +" detected: "+transFinal);
                            });
                            // Render an XML response
                            response.type('text/xml');
                            response.send(twiml.toString());
                         }
                    }); 
                }
            });     
        }
        if(hasSource) {
            // strip message  source inputs
            var req = req.replace(reg1, "");            
            // console.log("req" + req);  // for debugging
            req = req.replace(reg2,"");
            // console.log("striped: "+req); // for debugging       
            var twiml = new twilio.TwimlResponse();
           // console.log("src: "+src+" tar: "+tar); //for debugging
            // Use Watson to translate language
            language_translation.translate({
                text: req,
                source: src,
                target: tar
            }, function(err, translation) {
                if (err)
                    console.log(err)
                else {
                    //Get translation out of json object
                    var tansStringfy = JSON.stringify(translation);
                    var transSplit = tansStringfy.split(",");
                    var transDoubleSplit = transSplit[0].split(":");
                    var transFinal = transDoubleSplit[2].slice(1, transDoubleSplit[2].length -3);
                    // prepare the TwiML response 
                    //console.log("final:"+transFinal); // for debugging
                    twiml.message(function() {
                        this.body(transFinal);
                    });
                    // Render an XML response
                    response.type('text/xml');
                    response.send(twiml.toString());
                }
            }); 
        }         
    }
});

// Start the web application, and serve on local port 3000
app.listen(3000);

