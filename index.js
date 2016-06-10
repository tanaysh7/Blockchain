var express = require('express');
var bodyParser = require('body-parser');
var chain = require('chain-node');
var path = require('path');


/*CONSTANTS*/
var treasuryNodeID = "in07MGSAV9G08G6";
var treasuryNodeXPRV = "xprv9s21ZrQH143K2ycNXPxQdLFmFsp4aR1xoLdgKrACrvvP9ipN63o9qWXWm2niPjMFRTJUAY4bYiDpPTLErkJm3XxWMdpCaNBCRXir34h9C6p";
/*CONSTANTS*/

// Initializing express and chain parameters
var app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(__dirname + '/public'));

var c = new chain.Client({
	url: "https://fidelity-api.chain.com",
	tokenID: "at072R1XZKG09RC",
	tokenSecret: "c66c083cb6607ee18ffa7a01c9b48212"
});

// Signing keystore values for all manager nodes
// If a manager node is to be added, it's XPRV value needs to added here

// FIMT-MDM
c.keyStore.add(new chain.Xprv(
	"xprv9s21ZrQH143K277a4HQMooHvV2BPFfHMgbcKXC9uTtKsYNtBPvdUaMutMKdQ71M7JGzsAbtFTKpabMwfjqcdFrxYonEhh8FUui8LakPS4Rd", // Replace
	true
));

// FIMT-COMPLIANCE
c.keyStore.add(new chain.Xprv(
	"xprv9s21ZrQH143K3E9fjUnCovWBNjcZaBkPue282xBeodGa7s8YUxzy2wUsonouWbYLQcJEFRzfFicyWEwX2cNNNoB6tWCfRLDBeESP8hfTXtt", // Replace
	true
));

// FIMT-SDS
c.keyStore.add(new chain.Xprv(
	"xprv9s21ZrQH143K4EJXW6WXhBoxS1cZJqg8YvftRHAg8tZBkJUpVaTkkE3EKNjWRFhtmBtHu8Lh9d4nkUTGhA2mSX3j1fNzvT5tyrHsSiLTMKC", // Replace
	true
));

// Service for fetching recently issued assets and account activity

app.get('/fetch_assets_list', function (req, res) {
	c.listIssuerNodeActivity('in07MGSAV9G08G6', function(err, resp){
		res.send(resp['activities']);
	});
});

app.get('/fetch_activity_list', function (req, res) {
	c.listAccountActivity('acc082FCM0T008CG', function(err, resp){
		res.send(resp['activities']);
	});
});

app.get('/fetch_blocks_list', function (req, res) {
	c.listAuditorNodeBlocks(function(err, page) {
		res.send(page["blocks"]);
	})

});
 
// Services for fetching respective HTML pages


app.get('/index', function(req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});

app.get('/home', function(req, res) {
    res.sendFile(path.join(__dirname + '/home.html'));
});

app.get('/createAsset', function(req, res) {
    res.sendFile(path.join(__dirname + '/create-asset.html'));
});

app.get('/viewAsset', function(req, res) {
    res.sendFile(path.join(__dirname + '/asset-list.html'));
});

app.get('/createTransaction', function(req, res) {
    res.sendFile(path.join(__dirname + '/create-transaction.html'));
});

app.get('/viewTransactions', function(req, res) {
    res.sendFile(path.join(__dirname + '/transactions-list.html'));
});

app.get('/Transaction', function(req, res) {
    res.sendFile(path.join(__dirname + '/transaction.html'));
});

app.get('/stats', function(req, res) {
    res.sendFile(path.join(__dirname + '/stats.html'));
});

app.get('/about', function(req, res) {
    res.sendFile(path.join(__dirname + '/about.html'));
});

// Creating and issuing an asset by the treasury isser node

app.post('/create-asset', function(req, res) {
	var assetLabel = req.body.label;
	var assetAmount = req.body.amount;
	var assetAccount = req.body.account;
	c.keyStore.add(new chain.Xprv(
		treasuryNodeXPRV, // Replace
		true
	));
	c.createAsset(treasuryNodeID, assetLabel, function(err, resp){	
		c.issue(
		  resp['id'],
		  [
			{
			  account_id: assetAccount,
			  amount: parseInt(assetAmount)
			}
		  ],
		  function(err, internalResponse){
		  	console.log(internalResponse);
		  	if(internalResponse !== undefined){
		  		res.send("Successfully Issued");
		  	}
		  }
		)	
	})
});

// Listing accounts available to a manager node

app.post('/listAccounts', function(req, res) {
	var managerNode = req.body.manager;
	console.log(managerNode);
	c.listAccounts(managerNode, function(err, resp){
		if(resp !== undefined)
			res.send(resp['accounts']);
		else{
			console.log(err);
			res.send('undefined');
		}
	});
});

// Service call to list assetIDs and their qty available for an account

app.post('/listAssets', function(req, res) {
	var accountNumber = req.body.account;
	console.log(accountNumber);
	c.listAccountBalances(accountNumber, function(err, resp){
		if(resp !== undefined)
			res.send(resp['balances']);
		else{
			console.log(err);
			res.send('undefined');
		}
	});
});

// Service call for fetching asset label given an asset ID

app.post('/detailedAsset', function(req, res) {
	var assetID = req.body.assetID;
	 c.getAsset(assetID, function(err, resp){
	 	if(resp !== undefined)
	 		res.send(resp);
	 	else{
			console.log("undefined response!");
			res.send('undefined');
		}
	 })
});

// Service call for creating a transaction. XPRV signatures are defined above

app.post('/createTx', function(req, res) {
	var senderAccount = req.body.sender;
	var receiverAccount = req.body.receiver;
	var asset = req.body.assetID;
	var quantity = req.body.qty;
	var tx = {
	  inputs: [
	    {
	     account_id: senderAccount,
	     asset_id: asset,
	     amount: parseInt(quantity)
	    }
	  ],
	  outputs: [
	    {
	      account_id: receiverAccount,
	      asset_id: asset,
	      amount: parseInt(quantity)
	    }
	  ]
	}
	// response 'resp' needs to be put as parameters for signTransaction() and submitTransaction()
	c.buildTransaction(tx, function(err, resp){
	 	 console.log("response to build:"+resp);
	 	 console.log("error to build:"+err);
		 try{
			c.signTransaction(resp);
		 }catch(err){
			res.send("fail");
			console.log("error during sign:"+err);
		 }
		c.submitTransaction(resp, function(err, result) {
		   console.log("response to submit:"+result);
		   console.log("error:"+err);
		   if(err == null)
		   	res.send("success");
		   else
		   	res.send("fail");
		})
	});
});



// Service for fetching transactions
/*
app.get('/fetch_txs_list', function (req, res) {
	c.listAuditorNodeBlocks(function(err, page){
		if(page !== undefined){
			var entry = 0;
			for (var i in page['blocks']) {
				var val = page['blocks'][i];
				  c.getAuditorNodeBlockSummary(val['id'], function(err, summary) {
						var txs = summary['transaction_ids'];
						for(var i in txs){
							var tx = [];
							var value = txs[i];
							c.getAuditorNodeTransaction(value, function(err, transaction) {
								console.log(transaction);
								for(var j in transaction['inputs']){
									var input = transaction['inputs'][j];
									// c.getAsset(input['asset_id'], function(err, resp){
									// 	if(resp !== undefined){
									// 		console.log("INPUT");
									// 		console.log("Label:"+resp['label']);
									// 	}else{
									// 		console.log("Undefined label");
									// 	}
									// })
								}
								
								for(var j in transaction['outputs']){
									var output = transaction['outputs'][j];
									// c.getAsset(output['asset_id'], function(err, resp){
									// 	if(resp !== undefined){
									// 		console.log("OUTPUT");
									// 		console.log("Label:"+resp['label']);
									// 	}else{
									// 		console.log("Undefined label");
									// 	}
									// })
									break;
								}
								console.log(tx);
							
							})
							
						}
				  })
				  entry++;
				  if(entry == 1){
				  	break;
				  }
			}
		}else{
			res.send("Page returned an error");
			console.log("Auditor node blocks returned undefined");
			console.log(err);
		}
	});
});

*/


/*
c.listAuditorNodeBlocks(function(err, page){
	var output = {
		
	};
	if(page == undefined){
		console.log(err);
	}else{
		var entry = 0;
		for (var i in page['blocks']) {
		  var val = page['blocks'][i];
		//  console.log(i + " " + val['id'] + " " + val['transaction_count']);
		  c.getAuditorNodeBlockSummary(val['id'], function(err, summary) {
				var txs = summary['transaction_ids'];
				for(var i in txs){
					var tx = [];
					var value = txs[i];
					c.getAuditorNodeTransaction(value, function(err, transaction) {
						console.log(entry);
						for(var j in transaction['inputs']){
							var input = transaction['inputs'][j];
							 // console.log("INPUT");
							 // console.log(input);
							 // tx.push({"asset_id":input['asset_id']});
							 // tx.push({"type":input['type']});
							 // console.log("ASSET:"+input['asset_id']);
							 // console.log("TYPE:"+input['type']);
							 // console.log("AMOUNT:"+input['amount']);
							// c.getAsset(input['asset_id'], function(err, resp){
							// 	if(resp !== undefined){
							// 		console.log("INPUT");
							// 		console.log("Label:"+resp['label']);
							// 	}else{
							// 		console.log("Undefined label");
							// 	}
							// })
						}
						
						for(var j in transaction['outputs']){
							var output = transaction['outputs'][j];
							// console.log("OUTPUT");
							// console.log(output);
							//tx.push({"amount":output['amount']});
						  	//  console.log("AMOUNT:"+output['amount']);
							// c.getAsset(output['asset_id'], function(err, resp){
							// 	if(resp !== undefined){
							// 		console.log("OUTPUT");
							// 		console.log("Label:"+resp['label']);
							// 	}else{
							// 		console.log("Undefined label");
							// 	}
							// })
							break;
						}					
						//console.log(transaction['outputs']);
					})
					
				}
		  })
		  entry++;
		  if(entry == 5){
		  	break;
		  }
		}
	}
	
});
*/
/*
var e = c.listAuditorNodeBlocks(callbackListBlocks);


function callbackListBlocks(err,page){
	if(page == undefined){
		console.log(err);
	}else{
		var entry = 0;
		for (var i in page['blocks']) {
			var val = page['blocks'][i];
			c.getAuditorNodeBlockSummary(val['id'],callbackBlockDetail);
			entry++;
			if(entry == 5){
				break;
			}
		}
		return entry;
	}
}
function callbackBlockDetail(err,summary){
	var txs = summary['transaction_ids'];
	for(var i in txs){
		var tx = [];
		var value = txs[i];
		console.log(value);
		c.getAuditorNodeTransaction(value,callbackTxDetail);
		
	}
}

function callbackTxDetail(err, transaction){
	for(var j in transaction['inputs']){
		var input = transaction['inputs'][j];
		console.log("ASSET:"+input['asset_id']);
	}
	
	for(var j in transaction['outputs']){
		var output = transaction['outputs'][j];
		console.log("ASSET:"+output['amount']);
		break;
	}					
	//console.log(transaction['outputs']);
}
*/
 // c.getAuditorNodeBlockSummary("02733d2f9ab7dd93d7fa74b963e03ba970eb9af9bfca19e4636683e676ace312", function(err, summary) {
	// console.log(summary);
 // });


// c.getAuditorNodeTransaction("a692b4ed450428e4e9a8192796caa21e5ff5b87751a3c09b5604256ec19b802b", function(err,transaction) {
// 	console.log(transaction);
// })

//  a692b4ed450428e4e9a8192796caa21e5ff5b87751a3c09b5604256ec19b802b
//
//
// Test server. Change app.listen while hosting in live server
var server = app.listen(8000, function () {
  var host = server.address().address;
  var port = server.address().port;
  
var request = require('request');
request('http://fidelity-api.chain.com', function (error, response, body) {
 // console.log(response)
  if (!error && response.statusCode == 200) {
    console.log("Success") // Show the HTML for the Google homepage.
  }
  else
  console.log(error)
})

  console.log('Server Started %s:%s', host, port);
});


