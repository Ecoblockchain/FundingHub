Project location: https://github.com/professormarek/FundingHub.git

To test the FundingHub crowdfunding Dapp, have geth or compatible client running and listening on port 8545 for RPC calls. Simply open index.html in a browser, you don't need to run php or python server. 

To run the automated test first run TestRPC with a couple of accounts with known starting balances:
testrpc --account="0x012345678901234567890123456789012345678901234567890123456789123A,4712388000000000000" --account="0x012345678901234567890123456789012345678901234567890123456789123B,400000000000000000" --account="0x012345678901234567890123456789012345678901234567890123456789123C,300000000055000000"
then:
truffle test test/FundingHubTest.js
