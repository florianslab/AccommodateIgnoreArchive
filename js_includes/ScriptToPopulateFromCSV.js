/*
GetItemFrom(
    data,
    {
        Controller: function(x){ return x["Column"]; }, // or "Column"
        Name: function(x){ return x["Column"] }, // or "Column"
        Where: function(x){
            return (x["Column"]=="valeur");
        },
        Options:{
            option1: function(x){ return "Column"; }, // or "Column"
            option2: function(x){ return "Column"; } // or "Column"
        }
    })


var a = GetItemFrom(
    data,
    {
        ItemGroup: ["item","group"],
        Elements: [
            function(x){return "test";},
            function(x){return "Covered"},
            {
                covered: "CoveredPicture"
            }
        ]
    });
*/

function GetItemFrom(groupNum, Data, Scheme) {
    
    var colnames = Data[0], Where = Scheme.Where, ItemGroup = Scheme.ItemGroup, Elements = Scheme.Elements;
    //console.log(Data);
    
    // Checks
    if (Data.length < 2) throw "Data must be an array of length > 1";
    if (Where!=undefined&&typeof Where != "function") throw "Where must be a function";
    if (!Scheme.hasOwnProperty("Elements")) throw "You must define Elements";
    if (!Array.isArray(Elements)) throw "Elements must be an array";
    if ((Elements.length-1)%2) throw "Elements must contain a Name couples of Controllers+Options";

    if (Array.isArray(ItemGroup)) {
        if (typeof ItemGroup[0] != "string" || typeof ItemGroup[1] != "string")
            throw "ItemGroup must be an array of strings";
        if ((colnames.indexOf(ItemGroup[0], 0) < 0) ||
                (colnames.indexOf(ItemGroup[1], 0) < 0))
            throw "The members of ItemGroup must be columns of Data";
    }

    for (var i = 0; i < Elements.length; i++) {
        // Name or Controller
        if (i == 0 || i%2 == 1) {
            if (typeof Elements[i] == "string")
                (function (a) { Elements[i] = function(x) { return x[a]; }; }(Elements[i]));
            if (typeof Elements[i] != "function")
                throw (i==0?"Name ":"Controller ")+"must be a string or a function";
        }
        // Options
        else {
            for (option in Elements[i]){
                if (typeof Elements[i][option] == "string")
                    (function (a) { Elements[i][option] = function(x) { return x[a]; }; }(Elements[i][option]));
                if (typeof Elements[i][option] != "function") throw "Option '"+option+"'' must be a string or a function";
            }
        }
    }

    // Building the items
    var items = [];
    var groups = {};
    // Going through Data
    for (i in Data){
    
        if (i == 0) continue; // ignore the first line (colnames)
        var row = {};
        for (n in Data[i]) { row[colnames[n]] = Data[i][n]; }
        if (Where!=undefined&&!Where(row)) continue;

        var item = jQuery.extend(true, [], Elements); // Copy of Elements

        // Instanciating the item
        for (element in item){
            
            // Name or Controller
            if (element == 0 || element%2 == 1)
                item[element] = item[element](row);
            // Option
            else {
                for (option in item[element])
                    item[element][option] = item[element][option](row);
            }
        }

        // Handling Group
        //  
        //  groups = {
        //      item1: {
        //          group1: [ "Name", "Controller", Options, ... ],  
        //          group2: [ "Name", "Controller", Options, ... ]
        //      },
        //      item1: {
        //          group1: [ "Name", "Controller", Options, ... ],  
        //          group2: [ "Name", "Controller", Options, ... ]
        //      },
        //      ...
        //  }
        if (Array.isArray(ItemGroup)) {
            var itemID = row[ItemGroup[0]], groupID = row[ItemGroup[1]];
            // If this item is not listed yet, add it
            if (!groups.hasOwnProperty(itemID)) groups[itemID] = {};
            // Adding the item
            groups[itemID][groupID] = item;
        }
        // No group: directly add the item
        else items.push(item);

    }

    // If dealing with groups, adding the items in an order interacting with the latin square
    if (Array.isArray(ItemGroup)) {
        for (itemID in groups) {
             console.log(itemID);
             var item = groups[itemID][groupNum];
             item[0] = [item[0], itemID];
             items.push(item);
        }
    }
    return items;
}