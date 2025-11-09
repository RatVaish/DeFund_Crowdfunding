// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CrowdfundingV2
 * @dev Enhanced crowdfunding with milestones, categories, and images
 */
contract CrowdfundingV2 {

    // ==================== STATE VARIABLES ====================

    uint256 private campaignCounter;

    struct Milestone {
        string description;
        uint256 amount;
        bool completed;
        bool released;
        uint256 votesFor;
        uint256 votesAgainst;
    }

    struct Campaign {
        address creator;
        string title;
        string description;
        string category;
        string imageUrl;
        uint256 goalAmount;
        uint256 deadline;
        uint256 amountRaised;
        bool withdrawn;
        bool exists;
        uint256 milestoneCount;
    }

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    mapping(uint256 => mapping(uint256 => Milestone)) public milestones;
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public milestoneVotes;
    uint256[] public campaignIds;

    // ==================== EVENTS ====================

    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed creator,
        string title,
        string category,
        uint256 goalAmount,
        uint256 deadline,
        uint256 milestoneCount
    );

    event ContributionReceived(
        uint256 indexed campaignId,
        address indexed contributor,
        uint256 amount
    );

    event MilestoneCompleted(
        uint256 indexed campaignId,
        uint256 indexed milestoneId
    );

    event MilestoneVoted(
        uint256 indexed campaignId,
        uint256 indexed milestoneId,
        address voter,
        bool approve,
        uint256 weight
    );

    event MilestoneReleased(
        uint256 indexed campaignId,
        uint256 indexed milestoneId,
        uint256 amount
    );

    event FundsWithdrawn(
        uint256 indexed campaignId,
        address indexed creator,
        uint256 amount
    );

    event RefundIssued(
        uint256 indexed campaignId,
        address indexed contributor,
        uint256 amount
    );

    // ==================== MODIFIERS ====================

    modifier campaignExists(uint256 _campaignId) {
        require(campaigns[_campaignId].exists, "Campaign does not exist");
        _;
    }

    modifier campaignActive(uint256 _campaignId) {
        require(
            block.timestamp < campaigns[_campaignId].deadline,
            "Campaign has ended"
        );
        _;
    }

    modifier campaignEnded(uint256 _campaignId) {
        require(
            block.timestamp >= campaigns[_campaignId].deadline,
            "Campaign still active"
        );
        _;
    }

    modifier onlyCreator(uint256 _campaignId) {
        require(
            msg.sender == campaigns[_campaignId].creator,
            "Only campaign creator can call this"
        );
        _;
    }

    modifier onlyContributor(uint256 _campaignId) {
        require(
            contributions[_campaignId][msg.sender] > 0,
            "Only contributors can vote"
        );
        _;
    }

    // ==================== CONSTRUCTOR ====================

    constructor() {
        campaignCounter = 0;
    }

    // ==================== MAIN FUNCTIONS ====================

    function createCampaign(
        string memory _title,
        string memory _description,
        string memory _category,
        string memory _imageUrl,
        uint256 _goalAmount,
        uint256 _durationInDays,
        string[] memory _milestoneDescriptions,
        uint256[] memory _milestoneAmounts
    ) external returns (uint256) {
        require(_goalAmount > 0, "Goal amount must be greater than 0");
        require(_durationInDays > 0, "Duration must be at least 1 day");
        require(_durationInDays <= 365, "Duration cannot exceed 365 days");
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_description).length > 0, "Description cannot be empty");

        // Validate milestones
        if (_milestoneDescriptions.length > 0) {
            require(
                _milestoneDescriptions.length == _milestoneAmounts.length,
                "Milestone arrays must match"
            );

            uint256 totalMilestoneAmount = 0;
            for (uint256 i = 0; i < _milestoneAmounts.length; i++) {
                require(_milestoneAmounts[i] > 0, "Milestone amount must be > 0");
                totalMilestoneAmount += _milestoneAmounts[i];
            }
            require(
                totalMilestoneAmount == _goalAmount,
                "Milestone amounts must equal goal"
            );
        }

        uint256 deadline = block.timestamp + (_durationInDays * 1 days);

        campaignCounter++;
        uint256 newCampaignId = campaignCounter;

        campaigns[newCampaignId] = Campaign({
            creator: msg.sender,
            title: _title,
            description: _description,
            category: _category,
            imageUrl: _imageUrl,
            goalAmount: _goalAmount,
            deadline: deadline,
            amountRaised: 0,
            withdrawn: false,
            exists: true,
            milestoneCount: _milestoneDescriptions.length
        });

        // Create milestones
        for (uint256 i = 0; i < _milestoneDescriptions.length; i++) {
            milestones[newCampaignId][i] = Milestone({
                description: _milestoneDescriptions[i],
                amount: _milestoneAmounts[i],
                completed: false,
                released: false,
                votesFor: 0,
                votesAgainst: 0
            });
        }

        campaignIds.push(newCampaignId);

        emit CampaignCreated(
            newCampaignId,
            msg.sender,
            _title,
            _category,
            _goalAmount,
            deadline,
            _milestoneDescriptions.length
        );

        return newCampaignId;
    }

    function contribute(uint256 _campaignId)
        external
        payable
        campaignExists(_campaignId)
        campaignActive(_campaignId)
    {
        require(msg.value > 0, "Contribution must be greater than 0");

        Campaign storage campaign = campaigns[_campaignId];

        contributions[_campaignId][msg.sender] += msg.value;
        campaign.amountRaised += msg.value;

        emit ContributionReceived(_campaignId, msg.sender, msg.value);
    }

    function completeMilestone(uint256 _campaignId, uint256 _milestoneId)
        external
        campaignExists(_campaignId)
        onlyCreator(_campaignId)
    {
        Campaign storage campaign = campaigns[_campaignId];
        require(_milestoneId < campaign.milestoneCount, "Invalid milestone");
        require(campaign.amountRaised >= campaign.goalAmount, "Goal not reached");

        Milestone storage milestone = milestones[_campaignId][_milestoneId];
        require(!milestone.completed, "Milestone already completed");

        // Check previous milestones are released (enforce order)
        if (_milestoneId > 0) {
            require(
                milestones[_campaignId][_milestoneId - 1].released,
                "Previous milestone must be released first"
            );
        }

        milestone.completed = true;

        emit MilestoneCompleted(_campaignId, _milestoneId);
    }

    function voteOnMilestone(uint256 _campaignId, uint256 _milestoneId, bool _approve)
        external
        campaignExists(_campaignId)
        onlyContributor(_campaignId)
    {
        Campaign storage campaign = campaigns[_campaignId];
        require(_milestoneId < campaign.milestoneCount, "Invalid milestone");

        Milestone storage milestone = milestones[_campaignId][_milestoneId];
        require(milestone.completed, "Milestone not completed yet");
        require(!milestone.released, "Milestone already released");
        require(!milestoneVotes[_campaignId][_milestoneId][msg.sender], "Already voted");

        milestoneVotes[_campaignId][_milestoneId][msg.sender] = true;

        uint256 voteWeight = contributions[_campaignId][msg.sender];

        if (_approve) {
            milestone.votesFor += voteWeight;
        } else {
            milestone.votesAgainst += voteWeight;
        }

        emit MilestoneVoted(_campaignId, _milestoneId, msg.sender, _approve, voteWeight);
    }

    function releaseMilestone(uint256 _campaignId, uint256 _milestoneId)
        external
        campaignExists(_campaignId)
        onlyCreator(_campaignId)
    {
        Campaign storage campaign = campaigns[_campaignId];
        require(_milestoneId < campaign.milestoneCount, "Invalid milestone");
        require(campaign.amountRaised >= campaign.goalAmount, "Goal not reached");

        Milestone storage milestone = milestones[_campaignId][_milestoneId];
        require(milestone.completed, "Milestone not completed");
        require(!milestone.released, "Already released");

        // Simple majority vote
        require(
            milestone.votesFor > milestone.votesAgainst,
            "Milestone not approved by contributors"
        );

        milestone.released = true;

        uint256 amount = milestone.amount;
        (bool success, ) = payable(campaign.creator).call{value: amount}("");
        require(success, "Transfer failed");

        emit MilestoneReleased(_campaignId, _milestoneId, amount);
    }

    function withdrawFunds(uint256 _campaignId)
        external
        campaignExists(_campaignId)
        campaignEnded(_campaignId)
        onlyCreator(_campaignId)
    {
        Campaign storage campaign = campaigns[_campaignId];

        require(!campaign.withdrawn, "Funds already withdrawn");
        require(
            campaign.amountRaised >= campaign.goalAmount,
            "Funding goal not reached"
        );
        require(campaign.amountRaised > 0, "No funds to withdraw");

        // Only allow full withdrawal if no milestones
        require(campaign.milestoneCount == 0, "Use milestone release for this campaign");

        campaign.withdrawn = true;

        uint256 amount = campaign.amountRaised;

        (bool success, ) = payable(campaign.creator).call{value: amount}("");
        require(success, "Transfer failed");

        emit FundsWithdrawn(_campaignId, campaign.creator, amount);
    }

    function refund(uint256 _campaignId)
        external
        campaignExists(_campaignId)
        campaignEnded(_campaignId)
    {
        Campaign storage campaign = campaigns[_campaignId];

        require(
            campaign.amountRaised < campaign.goalAmount,
            "Campaign was successful, no refunds"
        );

        uint256 contributedAmount = contributions[_campaignId][msg.sender];
        require(contributedAmount > 0, "No contribution to refund");

        contributions[_campaignId][msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: contributedAmount}("");
        require(success, "Refund transfer failed");

        emit RefundIssued(_campaignId, msg.sender, contributedAmount);
    }

    // ==================== VIEW FUNCTIONS ====================

    function getCampaign(uint256 _campaignId)
        external
        view
        campaignExists(_campaignId)
        returns (Campaign memory)
    {
        return campaigns[_campaignId];
    }

    function getMilestone(uint256 _campaignId, uint256 _milestoneId)
        external
        view
        returns (Milestone memory)
    {
        return milestones[_campaignId][_milestoneId];
    }

    function getAllMilestones(uint256 _campaignId)
        external
        view
        campaignExists(_campaignId)
        returns (Milestone[] memory)
    {
        Campaign storage campaign = campaigns[_campaignId];
        Milestone[] memory allMilestones = new Milestone[](campaign.milestoneCount);

        for (uint256 i = 0; i < campaign.milestoneCount; i++) {
            allMilestones[i] = milestones[_campaignId][i];
        }

        return allMilestones;
    }

    function getTotalCampaigns() external view returns (uint256) {
        return campaignIds.length;
    }

    function getContribution(uint256 _campaignId, address _contributor)
        external
        view
        returns (uint256)
    {
        return contributions[_campaignId][_contributor];
    }

    function isGoalReached(uint256 _campaignId)
        public
        view
        campaignExists(_campaignId)
        returns (bool)
    {
        return campaigns[_campaignId].amountRaised >= campaigns[_campaignId].goalAmount;
    }

    function getAllCampaignIds() external view returns (uint256[] memory) {
        return campaignIds;
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function hasVoted(uint256 _campaignId, uint256 _milestoneId, address _voter)
        external
        view
        returns (bool)
    {
        return milestoneVotes[_campaignId][_milestoneId][_voter];
    }
}
