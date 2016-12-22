// Found here https://gist.github.com/xavierlepretre/88682e871f4ad07be4534ae560692ee6
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
        resolve(receipt);
      }
    } catch(e) {
      reject(e);
    }
  };

  return new Promise(function (resolve, reject) {
      transactionReceiptAsync(txnHash, resolve, reject);
  });
};

// Found here https://gist.github.com/xavierlepretre/afab5a6ca65e0c52eaf902b50b807401
var getEventsPromise = function (myFilter, count) {
  return new Promise(function (resolve, reject) {
    count = count ? count : 1;
    var results = [];
    myFilter.watch(function (error, result) {
      if (error) {
        reject(error);
      } else {
        count--;
        results.push(result);
      }
      if (count <= 0) {
        resolve(results);
        myFilter.stopWatching();
      }
    });
  });
};

// Found here https://gist.github.com/xavierlepretre/d5583222fde52ddfbc58b7cfa0d2d0a9
var expectedExceptionPromise = function (action, gasToUse) {
  return new Promise(function (resolve, reject) {
      try {
        resolve(action());
      } catch(e) {
        reject(e);
      }
    })
    .then(function (txn) {
      return web3.eth.getTransactionReceiptMined(txn);
    })
    .then(function (receipt) {
      // We are in Geth
      assert.equal(receipt.gasUsed, gasToUse, "should have used all the gas");
    })
    .catch(function (e) {
      if ((e + "").indexOf("invalid JUMP") > -1) {
        // We are in TestRPC
      } else {
        throw e;
      }
    });
};

contract('FundingHub', function(accounts) {

  
  it("should return funds to contributors if the project is not funded in time", function() {
    var fundingHub = FundingHub.deployed();
    var blockNumber = web3.eth.blockNumber + 1;
    var blockTime;
    var projectAddress;
    var beforeBalance;
    var lowBalance;

    console.log("time at the start "+ web3.eth.getBlock("latest").timestamp);

    console.log("creating a project that will expire in three seconds");
    return fundingHub.createProject(accounts[0], 100000002, 3, 'robot pie', {from: accounts[0], gas:3000000})
    .then(function(tx) {
        return Promise.all([
          getEventsPromise(fundingHub.ProjectCreated(
            {},
            { fromBlock: blockNumber, toBlock: "latest" })),
          web3.eth.getTransactionReceiptMined(tx)
        ]);
      }).then(function (eventAndReceipt) {
          var eventArgs = eventAndReceipt[0][0].args;
          projectAddress = eventArgs.projectAddress;
          console.log(projectAddress);
          console.log("Address 1 balance before contribute "+ web3.eth.getBalance(accounts[1]));
          beforeBalance = web3.eth.getBalance(accounts[1]);

          return fundingHub.contribute(projectAddress, {from: accounts[1], gas:3000000, value: 10000000})
          .then(function(tx2) {
            return Promise.all([
              getEventsPromise(fundingHub.ProjectDonation(
                {},
                { fromBlock: blockNumber, toBlock: "latest" })),
              web3.eth.getTransactionReceiptMined(tx2)
            ]);
          })
          .then(function (eventAndReceipt2) {
            var eventArgs = eventAndReceipt2[0][0].args;
            console.log("Address 1 balance after contribute "+ web3.eth.getBalance(accounts[1]));
            var totalCost = beforeBalance - web3.eth.getBalance(accounts[1]);
            var lowBalance = web3.eth.getBalance(accounts[1]);
            console.log("total transaction costs(gas+value) " + totalCost);
            console.log("time before jump "+ web3.eth.getBlock("latest").timestamp);
            //note - the below command does not appear to be implemented - workaround below...
            //evm_increaseTime(6);
            
            //sleep for 6 seconds so that the funding period for the project expires
            return setTimeout(function () {
                console.log("time after sleep "+ web3.eth.getBlock("latest").timestamp);
                return fundingHub.contribute(projectAddress, {from: accounts[0], gas:3000000, value: 1})
                .then(function(tx3) {
                  return Promise.all([
                    getEventsPromise(fundingHub.ProjectDonation(
                      {},
                      { fromBlock: blockNumber, toBlock: "latest" })),
                    web3.eth.getTransactionReceiptMined(tx3)
                  ]);
                })
                .then(function (eventAndReceipt3) {
                    console.log("final balance for contributor address (should be refunded) " + web3.eth.getBalance(accounts[1]));
                    var refund = web3.eth.getBalance(accounts[1]) - lowBalance;
                    console.log("amount refunded " + refund);
                    var refunded = web3.eth.getBalance(accounts[1]) > lowBalance;
                    assert.isTrue(refunded, "contribution was refunded to contributor");
                    assert.equal(refund.valueOf(), 10000000, "refund should be equal to the contribution");
                });

            }, 6000);
          })

      })

    });
});