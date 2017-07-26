// ############################  GENERAL SETTINGS ##########################
//
// Random group (1 to 8)
var groupNum = 1 + Math.floor(Math.random()*8);
//var groupNum = 2;
//
// Order of presentation.
var shuffleSequence = seq("Instructions","Order1","Transition",rshuffle("Order2"),"Final");
// var shuffleSequence = seq("Instructions","Order1","Transition","Final");
//
// No progressbar
//var showProgressBar = false;
//
// Where we will look for the ressources
var host = "http://files.lab.florianschwarz.net/ibexfiles/GlobAccom/GA2/";
//
// Default options
var defaults = [
    "Covered", {
        continueMessage: "Click here to continue.",
        sendResults: true,
        enabled: false, // At the beginning of the sequence, the trigger won't work
        clickablePictures: true // Disable the clicks
    },
    "Question", {
        // presentHorizontally: true,
        // leftComment: "Not confident",
        // rightComment: "Very confident",
        showNumbers: true,
        q:"How confident are you that the picture you selected is the one described by the sentence?",
        as:["Not confident","Somewhat confident","Confident","Quite confident","Very confident"]
    }
];

define_ibex_controller({
    name: "ContextCovered",

    jqueryWidget: {
        _init: function () {
            this.options.transfer = null; // Remove 'click to continue message'.         
            this.element.VBox({
                options: this.options,
                triggers: [1],
                children: [
                    "Message", { html: '<html><div style="text-align: center; margin:auto;"><p>'+ this.options.context+' </p></div></html>', transfer: null },
                    "Covered", { question: this.options.question,
                                 answers: this.options.answers,
                                 elements: this.options.elements}
                ]
            });
        }
    },

    properties: { }
});




//
// #########################################################################

// Returns an <img> tag
function img(picture) {
    return "<img src='"+host+'images/'+picture+"' />";
}

// General list of items
var items =
    [
        ["Instructions", "Message", {html: {include: "consentform.html"}}],
        ["Instructions", "Message", {html: {include: "warning.html"}}],        
        ["Instructions", "Message", {html: {include: "instructions.html"}}],
        
        ["Transition", "Message", {html: "<p>Now let's proceed to the actual experiment.</p><p>Please put your fingers on the 'Q' and 'Y' keys.</p><p> Press 'Q' or 'Y' to continue...</p>",transfer: "keypress"}],
        
        
        ["Final", "Form", {
          html: {include: "amt_form.html"},
          validators: {
            AMTID: function (s) {
                userID = (Date.now()/Math.pow(10,13)).toString(36).substring(2,15) + Math.random().toString(36).substring(2,15);
                $("input[name=AMTID]").val(userID);
                $("input[name=Group]").val(groupNum);
                return true;
            }
          }
        }],
    
        ["Final", "__SendResults__", {
          manualSendResults: true,
          sendingResultsMessage: "Please wait while your answers are being saved.",
          completionMessage: "Your answers have successfully being saved!"
        }],
    
        ["Final", "Dummy", { // Confirmation
          transfer: null,
          html: function () { return "<P>Thank you for your participation!</P>"+
                                     "<P>Please paste the following code into Amazon Mechanical Turk to validate your participation.</P>"+
                                     "<P style='font-weight:bold; text-align:center'>"+userID+"</P>"+
                                     "<P>Please note that if you don't report this code, we have no way to make sure that you participated in this study "+
                                     "and therefore you will not be paid.</P>"; }
        }]
        
    ].concat( // Feed the items from the variable data
    GetItemFrom(
        groupNum,
        data, {
        ItemGroup: ["ibexitem","group"],
        Elements: [
          function(x){return "Order"+x.Order;}, // Name
          function(x){return "Covered";},       // First Controller
          {                                     // First Element
              //context: function(x) { return [x.Context];},
              question: function(x) { return [x.item,x.group,x.Expt,x.Condition,x.Trigger,              // The question is just
                                              x.Context,x.Sentence,x.LeftPic1,400+800+x.Durcontext+500+x.Dursentence,x.Durcontext,x.Dursentence].join("+"); }, // for the result sheet
              answers: function(x){return {
                visible1: ["Q",img("pic1_i"+x.item+"_g"+x.Condition+".png")],
                visible2: ["Y",img("pic2_i"+x.item+"_g"+x.Condition+".png")]
                };
              },
              elements: function(x){
                return [
//                       {func: function(t){t.enabled=true;}},                        // Enable the triggers (F and J keys) FOR DEBUGGING
                       {pause: 400},                                               // Wait 400ms before showing the next elements
//                       x.Condition,
                       "<table class='Keys'><tr><td>Q</td><td>Y</td></tr></table>", // Show F and J on top of the pictures
                       {this: "choice"},                                            // The pictures
                       {pause: 800},                                                // Wait 800ms before "showing" the next elements
//                        x.Sentence,
                       {audio: host+"sf/"+x.item+x.Trigger+"-context.wav",waitfor:true},        // Play context
                       {pause: 500+x.Durcontext},
                       {func: function(t){t.enabled=true;}},                        // Enable the triggers (F and J keys)
                       {audio: host+"sf/"+x.item+x.Trigger+"-sentence.wav",waitfor:true}];       // Play sentence
              }
          },
            function(x){return "Question";},
            {
             },
            function(x){return "Message";},
            {
                html: function(x){return "<p>Please put your index fingers on the 'Q' and 'Y' keys.</p><p>Press 'Q' or 'Y' to continue...</p>";},
                transfer: function(x){return "keypress";}
             }
        ]
    })
    ); // End of concat

throw(items);