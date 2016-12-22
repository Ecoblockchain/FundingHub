pragma solidity ^0.4.4;

contract ProjectI{
    
    function getInfo() 
    constant
    returns (address owner, uint targetWei, uint donationsW, uint deadline);
    
    function fund(address funder)
    payable
    returns(bool accepted, bool inRepayment, bool funded, uint amount);
    
    function isOpen()
    constant
    returns (bool open);
}

contract Project is ProjectI{
    
    struct Funder{
        address addr;
        uint donatedWei;
        uint weiRepaid;//stores the amount they were repaid
    }
    
    //a struct as required is used to store the following data:
    struct ProjectDescription{
        address projectOwner;
        uint targetWei;
        uint deadline;
    }//not sure if we can add members to the struct per directions...
    /*
    my understanding is there are still limitations in passing struct
    types in solidity... or perhaps it was an ABI thing. 
    In any case, I will avoid passing this struct.
    */
    ProjectDescription private data;
    address private hub;
    uint weiSentToOwner;
    uint totalAmountCollected;
    uint totalAmountRepaid;
    Funder[] private funders;
    modifier onlyHub{
        if(msg.sender != hub) throw;
        _;
    }
    
    function Project(address projectOwner, uint targetWei, uint deadline){
        hub = msg.sender;
        weiSentToOwner = 0;
        totalAmountCollected = 0;
        totalAmountRepaid = 0;
        data.projectOwner = projectOwner;
        data.targetWei = targetWei;
        data.deadline = deadline;
    }
    
    function fund(address funder)
    onlyHub
    payable
    returns(bool accepted, bool inRepayment, bool funded, uint amount)
    {
        //if target has been reached, or passed deadline refund the sender.
        
        if(isOpen()){
            totalAmountCollected += msg.value;
            funders.push(Funder({addr: funder, donatedWei: msg.value, weiRepaid: 0}));
            return(true, false, false, msg.value);
        }else{
            bool successful = funder.send(msg.value);
            if(!successful){//this is the next best thing we can do! - couldn't sleep at night otherwise
                funders.push(Funder({addr: funder, donatedWei:msg.value, weiRepaid:0}));
            }
            if(totalAmountCollected >= data.targetWei){
                payout();
                return (false, false, true, weiSentToOwner);
            }else{
                refund();
                return(false, true, false, totalAmountRepaid);
            }
        }
        
    }
    
    //another possible design would have the project owner withdraw #rememberthedao
    function payout()
    private
    {
        if(this.balance > 0){
            uint amountPaid = this.balance;
            bool payoutSuccessful = data.projectOwner.send(this.balance);
            if(payoutSuccessful) {
                weiSentToOwner += amountPaid;
            }
        }
    }
    
    //another possible design would have the funders withdraw #rememberthedao
    function refund()
    private
    {
        if(this.balance > 0){
            for(uint i=0; i< funders.length; i++){
                if(funders[i].weiRepaid < funders[i].donatedWei){
                    bool successful = funders[i].addr.send(funders[i].donatedWei);
                    if(successful){
                        funders[i].weiRepaid = funders[i].donatedWei;
                        totalAmountRepaid += funders[i].weiRepaid;
                    }
                }
            }

        }
    }
    
    function getInfo() 
    onlyHub
    constant
    returns (address owner, uint targetWei, uint donationsW, uint deadline)
    {
        return (data.projectOwner , data.targetWei, totalAmountCollected, data.deadline);
    }
    
    
    function isOpen()
    constant
    returns (bool open){
        return now < data.deadline && totalAmountCollected < data.targetWei;
    }
    
}