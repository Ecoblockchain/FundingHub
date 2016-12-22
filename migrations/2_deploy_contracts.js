module.exports = function(deployer) {
	
	
	web3.eth.getAccounts(function(err, accs) {
    if (err != null) {
      console.log("There was an error fetching your accounts.");
      return;
    }

    if (accs.length == 0) {
      console.log("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
      return;
    }

    accounts = accs;
    account = accounts[0];

  });


  deployer.deploy(Project);
  deployer.autolink();
  deployer.deploy(FundingHub).then(function () {
  		FundingHub.deployed().createProject(account, 100000000, 2056, 'robot pie', {from: account, gas:3000000});
  	});
};
