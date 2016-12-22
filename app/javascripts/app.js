var accounts;
var account;


function setStatus(message) {
  var status = document.getElementById("status");
  status.innerHTML = message;
};

function postProject(){
      var meta = FundingHub.deployed();
      var deadline = parseInt(document.getElementById("deadline").value);
      var amount = parseInt(document.getElementById("amount").value);
      var description = document.getElementById("description").value;
      setStatus("Posting Project... (please wait)");
      meta.createProject(account, amount, deadline, description, {from: account, gas:3000000, value: 0})
      .then(function(value) {
                                                                    
        setStatus("Project Totally Posted, Dude!");
        console.log("postProject returned: value " + value);

        refreshDisplay();
        return web3.eth.getTransactionReceiptMined(value);                                                                    
      }).catch(function(e) {
        console.log(e);
        setStatus("Error posting project; see log.");
      });


}

function refreshDisplay(){
  var meta = FundingHub.deployed();
  var balance_element = document.getElementById("balance");
  balance_element.innerHTML = web3.fromWei(web3.eth.getBalance(account), "ether");

  meta.getProjectCount.call().then(function(value) {
    var projectCount_element = document.getElementById("projectCount");
    projectCount_element.innerHTML = value.valueOf();
    var count = parseInt(document.getElementById("projectCount").innerHTML);
    console.log("project count set to: " + count);
    refreshProjectList(count);
    return 1;
  }).catch(function(e) {
    console.log(e);
    setStatus("Error getting fileCount; see log.");
  });


}

function donateToProject(id, amount){
  var meta = FundingHub.deployed();
  console.log("getting address for project with id: " + id);
  meta.getAddressFromID.call(id).then(function(addr) {
    console.log("donateToProject got address " + addr);
    setStatus("attempting donation " + amount + " to project at address: " + addr);
    meta.contribute(addr, {from: account, gas:3000000, value: amount}).then(function(returned) {
      console.log("contribute apparently scucessful... result is: " + returned);
      //web3.eth.getTransactionReceiptMined(txID, 500);
      //refreshDisplay();

      return web3.eth.getTransactionReceiptMined(returned);                                                                    

      }).catch(function(e) {
             console.log("error from contribute...");
             console.log(e);
             setStatus("Error contributing; see log.");
      });
      return 1;
                                      
  }).catch(function(e) {
             console.log("error from getAddressFromID...");
             console.log(e);
             setStatus("Error getting project address; see log.");
  });


}

function refreshProjectList(count){
    var meta = FundingHub.deployed();

    var ul = document.getElementById("projectList");
    while (ul.firstChild) {
        ul.removeChild(ul.firstChild);
    }
    console.log("attempting to get project descriptions for " + count + " projects");
    
    for(var projectCount=1; projectCount<=count; projectCount++){
        (function(){ //this closure or whatever is to capture the value of projectCount
            var i = projectCount;

       
            meta.getInfo.call(projectCount).then(function(value) {
              //TODO: display only those that are still open!
              console.log(value.valueOf());
              var isOpen = value[4];
              if(isOpen){
                              console.log("project is open for business!");


              }else{
                              console.log("project is closed!!!!");
                              return;

              }

              var li = document.createElement("li");
              var ul = document.getElementById("projectList");
              

              var displayText = "Project: " + value[5] + "; target (Wei): " + value[1].valueOf() + "; amount raised so far (Wei): " + value[2].valueOf() + "; deadline: " + value[3].valueOf();
              li.appendChild(document.createTextNode(displayText));

              var inputText = document.createElement("input");
              inputText.setAttribute("type", "text");
              var inputID = "inputBox"+i;
              inputText.setAttribute("id", inputID);
              li.appendChild(inputText);
              var button = document.createElement("button");
              button.innerHTML = "Donate";

              button.id = i;


              button.addEventListener ("click", function() {
                        var tempID = "inputBox"+button.id;
                        var amount = document.getElementById(tempID).value;
                        donateToProject(button.id, amount);

              });
              li.appendChild(button);
              
              var id = "element" + count;
              li.setAttribute("id", id);
              ul.appendChild(li);
              return 1;
                                          
            }).catch(function(e) {
                       console.log("error from getInfo...");
                       console.log(e);
                       setStatus("Error getting project description; see log.");
            });
                                      
        })(); //extra closure or whatever to caputre the current value of projectCount
        
    }
    console.log("finished refreshing file list");
}


window.onload = function() {
  web3.eth.getAccounts(function(err, accs) {
    if (err != null) {
      alert("There was an error fetching your accounts.");
      return;
    }

    if (accs.length == 0) {
      alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
      return;
    }

    accounts = accs;
    account = accounts[0];
    refreshDisplay();

  });

    /*now that we have accounts, initialize web3 handler for reciepts. 
    This is sweet because it tells us the gas used 
    source: https://github.com/b9lab/live-coding-result/blob/master/app/javascripts/app.js
    */
    web3.eth.getTransactionReceiptMined = function (txnHash, interval) {
        var transactionReceiptAsync;
        interval = interval ? interval : 500;
        transactionReceiptAsync = function(txnHash, resolve, reject) {
            try {
                var receipt = web3.eth.getTransactionReceipt(txnHash);
                if (receipt == null) {
                    setTimeout(function () {
                               transactionReceiptAsync(txnHash, resolve, reject);
                    }, interval);
                } else {
                    console.log("transaction completed; gas used: " + receipt.gasUsed );
                    console.log(receipt);
                    refreshDisplay();

                    resolve(receipt);
                }
            } catch(e) {
                reject(e);
            }
        };
        
        if (Array.isArray(txnHash)) {
            var promises = [];
            txnHash.forEach(function (oneTxHash) {
                            promises.push(web3.eth.getTransactionReceiptMined(oneTxHash, interval));
                            });
            return Promise.all(promises);
        } else {
            return new Promise(function (resolve, reject) {
                               transactionReceiptAsync(txnHash, resolve, reject);
                               });
        }
    };

    //reference to the FundingHub contract
    var meta = FundingHub.deployed();

    var ProjectCreated = meta.ProjectCreated({fromBlock: web3.eth.blockNumber, toBlock: 'latest'});
    ProjectCreated.watch(function(error, result) {
      if (error == null) {
         console.log("Project Created! (address: " + result.args.projectAddress + ", by : "  + result.args.projectOwner + ", targetWei: " + result.args.targetWei.toString(10) + ", deadline: " + result.args.deadline.toString(10) + ", description: " + result.args.description + " )");
         return true;
      }else{
          console.log(error);
      }
    });

    var ProjectDonation = meta.ProjectDonation({fromBlock: web3.eth.blockNumber, toBlock: 'latest'});
    ProjectDonation.watch(function(error, result) {
      if (error == null) {
        console.log("Project Donation! ( by : " + result.args.donor + ", project address: " + result.args.projectAddress + ", amount: " + result.args.amount.toString(10) + " )");
        if(result.args.donor == account){
          setStatus("You donated " + result.args.amount.toString(10) + "to project " + result.args.projectAddress);
        }
        return true;
      }else{
          console.log(error);
      }
    });

    var Repaid = meta.Repaid({fromBlock: web3.eth.blockNumber, toBlock: 'latest'});
    Repaid.watch(function(error, result) {
      if (error == null) {
         console.log("Project Donation Refunded! ( funder : " + result.args.sender + ", project address: " + result.args.projectAddress + ", amount: " + result.args.amount.toString(10) + " )");
         return true;
      }else{
          console.log(error);
      }
    });

    var ProjectFunded = meta.ProjectFunded({fromBlock: web3.eth.blockNumber, toBlock: 'latest'});
    ProjectFunded.watch(function(error, result) {
      if (error == null) {
         console.log("Project Was Successfully funded! ( projectID : " + result.args.projectID + ", project owner's address: " + result.args.owner + ", amount: " + result.args.amount.toString(10) + ", target was: " + result.args.targetWei.toString(10) + ", total donations were: " + result.args.donationsW.toString(10) + " )");
         return true;
      }else{
          console.log(error);
      }
    });

    var FundersRepaid = meta.FundersRepaid({fromBlock: web3.eth.blockNumber, toBlock: 'latest'});
    FundersRepaid.watch(function(error, result) {
      if (error == null) {
         console.log("Funding failed, all funders being repaid! ( projectID : " + result.args.projectID  + ", amount: " + result.args.amount.toString(10) + ", target was: " + result.args.targetWei.toString(10) + ", total donations were: " + result.args.donationsW.toString(10) + " )");
         return true;
      }else{
          console.log(error);
      }
    });



}
