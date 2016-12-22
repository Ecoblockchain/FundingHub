pragma solidity ^0.4.4;

import "Project.sol";

contract FundingHub{
    
    mapping(address => uint) private projectIDs;//0 means no project there
    mapping(uint => address) private projects;
    mapping(uint => string) private projectDescriptions;

    bool private safemode;
    uint private projectCount;
    address private owner;
    
    modifier onlyOwner{
        if(msg.sender != owner) throw;
        _;
    }
    modifier failSafe{
        if(safemode) return;
        _;
    }
    
    modifier messageHasValue{
        if(msg.value == 0) throw;
        _;
    }
    
    event ProjectCreated(address projectAddress, address projectOwner, uint targetWei, uint deadline, string description);
    event ProjectDonation(address donor, address projectAddress, uint amount);
    event Repaid(address sender, address projectAddress, uint amount);
    event ProjectFunded(uint projectID, address owner, uint amount, uint targetWei, uint donationsW);
    event FundersRepaid(uint projectID, uint amount, uint targetWei, uint donationsW);
    
    function FundingHub(){
        projectCount = 0;
        owner = msg.sender;
        safemode = false;
    }
    
    function createProject(address projectOwner, uint targetWei, uint deadline_offset, string description)
    failSafe
    returns (address projectAddress, uint projectID)
    {
        if (targetWei == 0) throw;
        if (deadline_offset == 0) throw;
        
        //compute future blocktime of the deadline...
        uint deadline = now + deadline_offset;
        projectCount++;
        projects[projectCount] = new Project( projectOwner,  targetWei,  deadline);
        projectIDs[projects[projectCount]] = projectCount;
        projectDescriptions[projectCount] = description;
        
        ProjectCreated(projects[projectCount], projectOwner,  targetWei,  deadline, description);
        
        return(projects[projectCount], projectCount);

    }
    
    function getProjectCount()
    constant
    returns (uint count)
    {
        return projectCount;
    }
    
    function contribute(address projectAddress) 
    payable
    failSafe
    messageHasValue
    returns (bool accepted, bool inRepayment, bool funded, uint amount)
    {
        //check if valid project (Exists)
        if(projectIDs[projectAddress] != 0){
            var (accepted_, inRepayment_, funded_, amount_) = ProjectI(projectAddress).fund.value(msg.value).gas(2500000)(msg.sender);
            if(accepted_){
                //log success
                ProjectDonation(msg.sender, projectAddress, amount_ );
            }else{
                Repaid(msg.sender, projectAddress, amount_);
                var(owner_, targetWei_, donationsW_, deadline_) = ProjectI(projectAddress).getInfo();
                if(funded_){
                    //log that the project has been funded
                    ProjectFunded(projectIDs[projectAddress], owner_, amount_, targetWei_, donationsW_);
                }else if(inRepayment_){
                    //log that original funders have been repaid.
                    FundersRepaid(projectIDs[projectAddress], amount_, targetWei_, donationsW_);
                }
            }
            return (accepted_, inRepayment_, funded_, amount_);
        } else {
            throw;
        }
    }
    
    function getInfo(uint projectID) 
    constant
    returns (address owner, uint targetWei, uint donationsW, uint deadline, bool isOpen, string description)
    {
        if (projectID == 0 || projectID > projectCount){
            return (0,0,0,0,false,"Project Does Not Exist");
        }else{
            ProjectI project = ProjectI(projects[projectID]);
            var(owner_, targetWei_, donationsW_, deadline_) = project.getInfo();
            string description_ = projectDescriptions[projectID];
            bool isOpen_ = project.isOpen();
            return (owner_, targetWei_, donationsW_, deadline_, isOpen_, description_);
        }

    }

    function getAddressFromID(uint projectID)
    constant
    returns (address projectAddress)
    {
        return projects[projectID];
    }
    
    function redAlert()
    onlyOwner
    {
        //TODO: log an event
        safemode = true;
    }
}

