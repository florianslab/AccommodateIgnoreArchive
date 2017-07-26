/* This software is licensed under a BSD license; see the LICENSE file for details. */

//
// TODO: Replace this controller with something that's not such a horrible mess!
//

(function () {
    
var __Question_callback__ = null;
var __Questions_answers__ = [];
var __Times__ = [];
var __Visible_picture__ = null;
var __Covered_picture__ = null;

define_ibex_controller({
name: "Covered",

jqueryWidget: {
    _init: function () {
        
        __Times__ = [];
        __Questions_answers__ = [];
        
        // Checks that the browser can play audio files
        var a = document.createElement('audio');
        if (!(a.canPlayType && a.canPlayType('audio/mpeg;').replace(/no/, ''))) {
            var errorMessage = "We are sorry but your browser seems not to support our audio playing. " +
                            "You therefore cannot take part in this experiment. Thank you for your understanding."
            alert(errorMessage);
            throw new Error(errorMessage);
        }
        
        this.cssPrefix = this.options._cssPrefix;
        this.utils = this.options._utils;
        this.finishedCallback = this.options._finishedCallback;

        var questionField = "Legend";
        var answerField = "Chosen picture ('visible' or 'covered')";
        var correctField = "Whether or not answer was correct (NULL if N/A)";
        var timeField = "Time taken to answer.";
        
        this.contextPicture = dget(this.options, "context");
        this.answers = this.options.answers;
        this.question = dget(this.options, "question");
        this.sendResults = dget(this.options, "sendResults", true);
        this.elements = dget(this.options, "elements");
        this.autoScroll = dget(this.options, "autoScroll", true);
        //this.clickablePictures = true;
        this.hasCorrect = dget(this.options, "hasCorrect", false);
        this.randomOrder = dget(this.options, "randomOrder", ! (this.hasCorrect === false));
        this.enabled = dget(this.options, "enabled", true);

        assert(typeof this.answers == "object", "'Answers' must be an object");
        for (a in this.answers) assert(
          (Array.isArray(this.answers[a])&&this.answers[a].length==2&&
          typeof(this.answers[a][0])=="string"&&typeof(this.answers[a][1])=="string")||
          typeof this.answers[a] == "string", "Each answer must be either a string or an array");

        // hasCorrect is either false, indicating that there is no correct answer,
        // or a string giving the correct answer's index.
        // Now we change it to either false or an index.
        if (typeof(this.hasCorrect) == "string") assert(this.answers.hasOwnProperty(this.hasCorrect),
          "Value of 'hasCorrect' option not recognized");

        this.answerNames = Object.keys(this.answers);
        
        if (this.randomOrder) {
            assert(!Array.isArray(this.randomOrder) || typeof(this.answers[this.answerNames[0]]) == "string",
                  "Cannot set 'randomOrder' option to a list of keys when keys are included with the 'answers' option.");
            assert(this.randomOrder === true || typeof(this.answerNames.length == this.randomOrder.length),
                   "Length of 'randomOrder' doesn't match number of 'answers'.");
            this.orderedAnswers = new Array(this.answerNames.length);
            for (var i = 0; i < this.answerNames.length; ++i)
                this.orderedAnswers[i] = this.answerNames[i];
            fisherYates(this.orderedAnswers);
        }
        else {
            this.orderedAnswers = this.answerNames;
        }

        this.setFlag = function(correct) {
            if (! correct) {
                this.utils.setValueForNextElement("failed", true);
            }
        }

        var t = this;

        var showNext = function (next, newRT) {
            
          if (next.length < 1) {
            t.finishedCallback(__Questions_answers__);
            return false;
          }
          else {
            
            if (newRT) __Times__.push(new Date().getTime());
              
            for (el in next) {
                $(t.element.children()[next[el]]).css("display", "block");
                if (t.element.children()[next[el]].nodeName == "AUDIO")
                    t.element.children()[next[el]].play();
                else if (t.element.children()[next[el]].nodeName == "PAUSE")
                    // Have to use this hack (IIFE) to make sure "elementsToShow" is interpreted right away
                    (function(a) {
                        setTimeout(function()
                        {
                          showNext(a.attr("next").split(","));
                        },
                        a.attr("value"));
                    }($(t.element.children()[next[el]])));
                else if (t.elements[next[el]].hasOwnProperty("func"))
                    t.elements[next[el]].func(t);
              if (t.autoScroll) {
                    window.scrollTo(0,document.body.scrollHeight);
              }
            }
          }
        };
            
        var continueButton = function (next, text, func, newRT) {
          if (!text || text == "") text = dget(t.options, "continueMessage", "Click here to continue.");
          var button = $(document.createElement("p"))
                          .css('clear', 'left')
                          .append($(document.createElement("a"))
                                    .addClass(t.cssPrefix + 'continue-link')
                                    .text("\u2192 " + text)
                          );
          return button.click(function() {
                   if (typeof func == "function") {
                     func(button);
                   }
                   $(this).css("display","none");
                   showNext(next, newRT);
                 });
        };
                
        /////////////////////////
        //
        // PROBING THIS.ELEMENTS
        //
        /////////////////////////
        var elementsToShow = [];
        var domelements = new Array(this.elements.length);
        for (var el = this.elements.length-1; el >= 0; --el) {
                
            // Simple line of text (paragraph)
          if (typeof this.elements[el] == "string") {
            domelements[el] = $(document.createElement("p")).append(this.elements[el]).addClass(this.cssPrefix + "rawText");
          }
            // Line of text (paragraph), waiting for click before printing the next elements
          else if (this.elements[el].hasOwnProperty("waitForClick")) {
            var t = this;
            domelements[el] = $(document.createElement("p")).append(t.elements[el].waitForClick).addClass(this.cssPrefix + "waitFor");
            domelements[el].append(continueButton(elementsToShow, t.elements[el].buttonText, t.elements[el].onClick, t.elements[el].newRT));
            elementsToShow = [];
          }
            // Line of text (paragraph), waiting for click before printing the next elements and deleting this line
          else if (this.elements[el].hasOwnProperty("deleteAfterClick")) {
            var t = this;
            domelements[el] = $(document.createElement("p")).append(t.elements[el].deleteAfterClick).addClass(this.cssPrefix + "deleteAfter");
            domelements[el].append(continueButton(elementsToShow, t.elements[el].buttonText, function (link) {
                                                    if (typeof t.elements[el].onClick == "function") {
                                                      t.elements[el].onClick();
                                                    }
                                                    link.parent().css("display","none");
                                                  }
                                   , t.elements[el].newRT));
            elementsToShow = [];
          }
            // Function
          else if (this.elements[el].hasOwnProperty("func")) {
              domelements[el] = $(document.createElement("func"));
          }
            // Pause
          else if (this.elements[el].hasOwnProperty("pause")) {
              // Have to use this hack (IIFE) to make sure "elementsToShow" is interpreted right away
              (function(a, b) { 
                  domelements[el] = $(document.createElement("pause")).attr("value", a).attr("next", b);
              }(this.elements[el].pause, elementsToShow));
              elementsToShow = [];
          }
            // Audio file
          else if (this.elements[el].hasOwnProperty("audio")) {
              var t = this;
              domelements[el] = $('<audio />', { controls : 'controls', preload : 'auto' });
              domelements[el].append($(document.createElement("source")).attr("src",t.elements[el].audio)).attr("controls","");
              if (t.elements[el].show == "none") domelements[el].addClass("display", "none");
              var wait = function () { };
              if (t.elements[el].hasOwnProperty("waitFor")) {
                  // Have to use this hack (IIFE) to make sure "elementsToShow" is interpreted right away
                  (function(a,b) { wait = function () { showNext(a, b); }; }(elementsToShow, t.elements[el].newRT));
                  elementsToShow = [];
              }
              var end = function () { };
              if (typeof t.elements[el].ended == "function") {
                  end = t.elements[el].ended;
              }
              // Have to use an IIFE to make sure "end" and "wait" are interpreted right away (infinite recursion otherwise)
              (function (end, wait) {
                t.safeBind(domelements[el], 'ended', function () { end(__Visible_picture__, __Covered_picture__); wait(); });
               }(end,wait));
          }
            // Printing one the non-element items of the control
          else if (this.elements[el].hasOwnProperty("this")) {
              // The context picture
            if (this.elements[el].this == "context") {
              var picture = $(document.createElement("img")).attr("src", this.contextPicture).addClass(this.cssPrefix + "contextPicture");
              domelements[el] = $(document.createElement("p")).append(picture);
            }
            /////////////////////////////////////////////////
              // Choice between visible and covered picture
            else if (this.elements[el].this == "choice") {
              this.xl = $(document.createElement("ul")).css('margin-left', "2em").css('padding-left', 0);
              var t = this, func = this.elements[el].onClick;
                // Creating the picture DOM elements
              for (answerName in this.orderedAnswers) {
                  var li, answer = this.orderedAnswers[answerName];
                  li = $(document.createElement("li")).addClass(this.cssPrefix + "scale-box").attr('id',answer);
                    // Whether a click on one of the two pictures goes to the next item
                  if (this.clickablePictures) {
                    (function (li) {
                          li.mouseover(function () {
                            if (t.clickablePictures)
                               li.css('cursor', 'pointer');
                          });
                          li.mouseout(function () {
                            if (t.clickablePictures)
                               li.css('cursor', "default");
                          });
                    })(li);
                    (function(i, li) {
                      li.click(function () { if (t.clickablePictures) __Question_callback__(answer); });
                    })(answer, li);
                  }
                  var ans = typeof(this.answers[answer]) == "string" ? this.answers[answer] : this.answers[answer][1];
                  var a = $(document.createElement("span")).addClass(this.cssPrefix + (this.clickablePictures ? "fake-link" : "no-link"));
                  this.xl.append(li.append(a.append(ans)));
              }
              var toShow = elementsToShow;
                // The function called when choosing the Ith picture
              __Question_callback__ = function (answer) {
                  if (!t.enabled) return;
                  if (typeof func == "function") {
                    func(answer, t);
                  }
                  var answerTime = new Date().getTime();
                  var correct = "NULL";
                  if (! (t.hasCorrect === false)) {
                    correct = (answer == t.hasCorrect);
                    t.setFlag(correct);
                  }
                  for (n = 0 ; n < __Times__.length ; n++) {
                    __Questions_answers__.push([
                       [questionField, t.question ? csv_url_encode(t.question) : "NULL"],
                                   [answerField, csv_url_encode(answer)],
                                   [correctField, correct],
                                   [timeField, answerTime - __Times__[n]]
                           ]);
                  }
                  if (t.sendResults) t.finishedCallback(__Questions_answers__);
                  else showNext(toShow);
              };
              
              var table = $("<table" + (conf_centerItems ? " align='center'" : "") + ">");
              var tr = $(document.createElement("tr"));
              var td = $("<td" + (conf_centerItems ? " align='center'" : "") + ">")
              if (conf_centerItems)
                  td.attr('align', 'center');
              domelements[el] = table.append(tr.append(td.append(this.xl)));
              //elementsToShow = [];
            }
              // End of choice between visible and covered picture
            /////////////////////////////////////////////////
              
              // Legend, simple line of text printed under the two pictures
            if (this.elements[el].question) {
              domelements[el].append($(document.createElement("p")).append(this.elements[el].question).addClass(this.cssPrefix+"legend"));
            }
          }
          elementsToShow.push(el);
        }
        ///////////////////////
        //
        // END OF THIS.ELEMENTS
        //
        ///////////////////////
                
        // Handling keys
        t.safeBind($(document),"keydown", function(e) {
            for (var n = 0; n < t.elements.length ; n++) {
              if ((typeof t.answers[t.answerNames[0]] != "string" || Array.isArray(t.randomOrder)) &&
                   t.elements[n].this == "choice" && domelements[n].css("display") != "none") {
                      for (i in t.orderedAnswers) {
                        var answer = t.orderedAnswers[i];
                        if ((Array.isArray(t.randomOrder) && e.keyCode == t.randomOrder[i].toUpperCase().charCodeAt(0)) ||
                            (!Array.isArray(t.randomOrder) && e.keyCode == t.answers[answer][0].toUpperCase().charCodeAt(0)))
                             __Question_callback__(answer);
                }
              }
            }   
        });
                
        var hide = false;
        for (el in domelements) {
          var ele = this.elements[el];
          
          if (hide) {
              domelements[el].css("display", "none");
          }
          else if (ele.hasOwnProperty("func")) {
              ele.func(this);
          }
          else if (ele.hasOwnProperty("pause")) {
              // Have to use this hack (IIFE) to make sure "elementsToShow" is interpreted right away
              (function(a,b) {
                  $(function() {
                    setTimeout(function () {
                      showNext(b);
                    },
                    a);
                  });
                }(domelements[el].attr("value"), domelements[el].attr("next").split(',')));
          }
          else if (ele.hasOwnProperty("audio")) {
              domelements[el].attr("autoplay","autoplay");
          }
          this.element.append(domelements[el]);
            
          if (ele.hasOwnProperty("waitForClick") || ele.hasOwnProperty("deleteAfterClick") || ele.hasOwnProperty("pause") ||
              //(ele.hasOwnProperty("this") && ele.this == "choice") || ele.hasOwnProperty("waitFor")) {
              ele.hasOwnProperty("waitFor")) {
                  hide = true;
          }
        }

        /*if (!this.clickablePictures) {
          this.element.append(continueButton([]));   
        }*/

        if (this.timeout && this.clickablePictures) {
            var t = this;
            this.utils.setTimeout(function () {
                var answerTime = new Date().getTime();
                t.setFlag(false);
                t.finishedCallback([[[questionField, t.question ? csv_url_encode(t.question) : "NULL"],
                                     [answerField, "NULL"], [correctField, "NULL"],
                                     [timeField, answerTime - t.creationTime]]]);
            }, this.timeout);
        }

        // Store the time when this was first displayed.
        this.creationTime = new Date().getTime();
                
        __Times__.push(this.creationTime);
    }
},

properties: {
    obligatory: [],
    htmlDescription: function(opts) {
        return $(document.createElement("div")).text(opts.s || "");
    }
}
});

})();

