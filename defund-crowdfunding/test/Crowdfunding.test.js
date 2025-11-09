const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Crowdfunding", function () {
  // Test fixture - runs before each test
  async function deployCrowdfundingFixture() {
    const [owner, user1, user2, user3] = await ethers.getSigners();

    const Crowdfunding = await ethers.getContractFactory("Crowdfunding");
    const crowdfunding = await Crowdfunding.deploy();

    return { crowdfunding, owner, user1, user2, user3 };
  }

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      const { crowdfunding } = await deployCrowdfundingFixture();
      expect(await crowdfunding.getTotalCampaigns()).to.equal(0);
    });

    it("Should have correct initial contract balance", async function () {
      const { crowdfunding } = await deployCrowdfundingFixture();
      expect(await crowdfunding.getContractBalance()).to.equal(0);
    });
  });

  describe("Campaign Creation", function () {
    it("Should create a campaign successfully", async function () {
      const { crowdfunding, owner } = await deployCrowdfundingFixture();

      const goalAmount = ethers.parseEther("10");
      const duration = 30;

      const tx = await crowdfunding.createCampaign(
        "Test Campaign",
        "This is a test campaign",
        goalAmount,
        duration
      );

      // Just check that the event was emitted, don't check exact timestamp
      await expect(tx)
        .to.emit(crowdfunding, "CampaignCreated");

      expect(await crowdfunding.getTotalCampaigns()).to.equal(1);

      const campaign = await crowdfunding.getCampaign(1);
      expect(campaign.creator).to.equal(owner.address);
      expect(campaign.title).to.equal("Test Campaign");
      expect(campaign.goalAmount).to.equal(goalAmount);
    });

    it("Should increment campaign ID correctly", async function () {
      const { crowdfunding } = await deployCrowdfundingFixture();

      await crowdfunding.createCampaign("Campaign 1", "Description 1", ethers.parseEther("5"), 30);
      await crowdfunding.createCampaign("Campaign 2", "Description 2", ethers.parseEther("10"), 60);

      expect(await crowdfunding.getTotalCampaigns()).to.equal(2);

      const campaign1 = await crowdfunding.getCampaign(1);
      const campaign2 = await crowdfunding.getCampaign(2);

      expect(campaign1.title).to.equal("Campaign 1");
      expect(campaign2.title).to.equal("Campaign 2");
    });

    it("Should store campaign details correctly", async function () {
      const { crowdfunding, owner } = await deployCrowdfundingFixture();

      const goalAmount = ethers.parseEther("15");
      const duration = 45;

      await crowdfunding.createCampaign(
        "Detailed Campaign",
        "A very detailed description",
        goalAmount,
        duration
      );

      const campaign = await crowdfunding.getCampaign(1);

      expect(campaign.creator).to.equal(owner.address);
      expect(campaign.title).to.equal("Detailed Campaign");
      expect(campaign.description).to.equal("A very detailed description");
      expect(campaign.goalAmount).to.equal(goalAmount);
      expect(campaign.amountRaised).to.equal(0);
      expect(campaign.withdrawn).to.equal(false);
      expect(campaign.exists).to.equal(true);
    });

    it("Should revert if goal amount is 0", async function () {
      const { crowdfunding } = await deployCrowdfundingFixture();

      await expect(
        crowdfunding.createCampaign("Bad Campaign", "Description", 0, 30)
      ).to.be.revertedWith("Goal amount must be greater than 0");
    });

    it("Should revert if duration is 0", async function () {
      const { crowdfunding } = await deployCrowdfundingFixture();

      await expect(
        crowdfunding.createCampaign("Bad Campaign", "Description", ethers.parseEther("10"), 0)
      ).to.be.revertedWith("Duration must be at least 1 day");
    });

    it("Should revert if duration exceeds 365 days", async function () {
      const { crowdfunding } = await deployCrowdfundingFixture();

      await expect(
        crowdfunding.createCampaign("Bad Campaign", "Description", ethers.parseEther("10"), 366)
      ).to.be.revertedWith("Duration cannot exceed 365 days");
    });

    it("Should revert if title is empty", async function () {
      const { crowdfunding } = await deployCrowdfundingFixture();

      await expect(
        crowdfunding.createCampaign("", "Description", ethers.parseEther("10"), 30)
      ).to.be.revertedWith("Title cannot be empty");
    });

    it("Should revert if description is empty", async function () {
      const { crowdfunding } = await deployCrowdfundingFixture();

      await expect(
        crowdfunding.createCampaign("Title", "", ethers.parseEther("10"), 30)
      ).to.be.revertedWith("Description cannot be empty");
    });
  });

  describe("Contributions", function () {
    it("Should accept contributions", async function () {
      const { crowdfunding, owner, user1 } = await deployCrowdfundingFixture();

      await crowdfunding.createCampaign("Test", "Description", ethers.parseEther("10"), 30);

      const contributionAmount = ethers.parseEther("2");

      await expect(
        crowdfunding.connect(user1).contribute(1, { value: contributionAmount })
      ).to.emit(crowdfunding, "ContributionReceived")
        .withArgs(1, user1.address, contributionAmount);

      const campaign = await crowdfunding.getCampaign(1);
      expect(campaign.amountRaised).to.equal(contributionAmount);
    });

    it("Should track individual contributions", async function () {
      const { crowdfunding, user1, user2 } = await deployCrowdfundingFixture();

      await crowdfunding.createCampaign("Test", "Description", ethers.parseEther("10"), 30);

      await crowdfunding.connect(user1).contribute(1, { value: ethers.parseEther("3") });
      await crowdfunding.connect(user2).contribute(1, { value: ethers.parseEther("5") });

      expect(await crowdfunding.getContribution(1, user1.address)).to.equal(ethers.parseEther("3"));
      expect(await crowdfunding.getContribution(1, user2.address)).to.equal(ethers.parseEther("5"));
    });

    it("Should accept multiple contributions from same user", async function () {
      const { crowdfunding, user1 } = await deployCrowdfundingFixture();

      await crowdfunding.createCampaign("Test", "Description", ethers.parseEther("10"), 30);

      await crowdfunding.connect(user1).contribute(1, { value: ethers.parseEther("2") });
      await crowdfunding.connect(user1).contribute(1, { value: ethers.parseEther("3") });

      expect(await crowdfunding.getContribution(1, user1.address)).to.equal(ethers.parseEther("5"));

      const campaign = await crowdfunding.getCampaign(1);
      expect(campaign.amountRaised).to.equal(ethers.parseEther("5"));
    });

    it("Should revert contribution with 0 value", async function () {
      const { crowdfunding, user1 } = await deployCrowdfundingFixture();

      await crowdfunding.createCampaign("Test", "Description", ethers.parseEther("10"), 30);

      await expect(
        crowdfunding.connect(user1).contribute(1, { value: 0 })
      ).to.be.revertedWith("Contribution must be greater than 0");
    });

    it("Should revert contribution to non-existent campaign", async function () {
      const { crowdfunding, user1 } = await deployCrowdfundingFixture();

      await expect(
        crowdfunding.connect(user1).contribute(999, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Campaign does not exist");
    });

    it("Should revert contribution after deadline", async function () {
      const { crowdfunding, user1 } = await deployCrowdfundingFixture();

      await crowdfunding.createCampaign("Test", "Description", ethers.parseEther("10"), 30);

      // Fast forward time by 31 days
      await time.increase(31 * 24 * 60 * 60);

      await expect(
        crowdfunding.connect(user1).contribute(1, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Campaign has ended");
    });
  });

  describe("Withdraw Funds", function () {
    it("Should allow creator to withdraw when goal is met", async function () {
      const { crowdfunding, owner, user1 } = await deployCrowdfundingFixture();

      await crowdfunding.createCampaign("Test", "Description", ethers.parseEther("10"), 30);

      // Contribute enough to meet goal
      await crowdfunding.connect(user1).contribute(1, { value: ethers.parseEther("10") });

      // Fast forward past deadline
      await time.increase(31 * 24 * 60 * 60);

      const initialBalance = await ethers.provider.getBalance(owner.address);

      await expect(
        crowdfunding.withdrawFunds(1)
      ).to.emit(crowdfunding, "FundsWithdrawn")
        .withArgs(1, owner.address, ethers.parseEther("10"));

      const finalBalance = await ethers.provider.getBalance(owner.address);
      expect(finalBalance).to.be.gt(initialBalance);

      const campaign = await crowdfunding.getCampaign(1);
      expect(campaign.withdrawn).to.equal(true);
    });

    it("Should revert if goal not reached", async function () {
      const { crowdfunding, owner, user1 } = await deployCrowdfundingFixture();

      await crowdfunding.createCampaign("Test", "Description", ethers.parseEther("10"), 30);

      // Contribute less than goal
      await crowdfunding.connect(user1).contribute(1, { value: ethers.parseEther("5") });

      // Fast forward past deadline
      await time.increase(31 * 24 * 60 * 60);

      await expect(
        crowdfunding.withdrawFunds(1)
      ).to.be.revertedWith("Funding goal not reached");
    });

    it("Should revert if called before deadline", async function () {
      const { crowdfunding, owner, user1 } = await deployCrowdfundingFixture();

      await crowdfunding.createCampaign("Test", "Description", ethers.parseEther("10"), 30);

      await crowdfunding.connect(user1).contribute(1, { value: ethers.parseEther("10") });

      await expect(
        crowdfunding.withdrawFunds(1)
      ).to.be.revertedWith("Campaign still active");
    });

    it("Should revert if called by non-creator", async function () {
      const { crowdfunding, user1, user2 } = await deployCrowdfundingFixture();

      await crowdfunding.createCampaign("Test", "Description", ethers.parseEther("10"), 30);

      await crowdfunding.connect(user1).contribute(1, { value: ethers.parseEther("10") });

      await time.increase(31 * 24 * 60 * 60);

      await expect(
        crowdfunding.connect(user2).withdrawFunds(1)
      ).to.be.revertedWith("Only campaign creator can call this");
    });

    it("Should revert if already withdrawn", async function () {
      const { crowdfunding, owner, user1 } = await deployCrowdfundingFixture();

      await crowdfunding.createCampaign("Test", "Description", ethers.parseEther("10"), 30);

      await crowdfunding.connect(user1).contribute(1, { value: ethers.parseEther("10") });

      await time.increase(31 * 24 * 60 * 60);

      await crowdfunding.withdrawFunds(1);

      await expect(
        crowdfunding.withdrawFunds(1)
      ).to.be.revertedWith("Funds already withdrawn");
    });

    it("Should revert if trying to withdraw with no contributions", async function () {
      const { crowdfunding, owner } = await deployCrowdfundingFixture();

      await crowdfunding.createCampaign("Test", "Description", ethers.parseEther("10"), 30);

      await time.increase(31 * 24 * 60 * 60);

      await expect(
        crowdfunding.withdrawFunds(1)
      ).to.be.revertedWith("Funding goal not reached");
    });
  });

  describe("Refunds", function () {
    it("Should allow refund when goal not met", async function () {
      const { crowdfunding, user1 } = await deployCrowdfundingFixture();

      await crowdfunding.createCampaign("Test", "Description", ethers.parseEther("10"), 30);

      const contributionAmount = ethers.parseEther("5");
      await crowdfunding.connect(user1).contribute(1, { value: contributionAmount });

      await time.increase(31 * 24 * 60 * 60);

      const initialBalance = await ethers.provider.getBalance(user1.address);

      await expect(
        crowdfunding.connect(user1).refund(1)
      ).to.emit(crowdfunding, "RefundIssued")
        .withArgs(1, user1.address, contributionAmount);

      const finalBalance = await ethers.provider.getBalance(user1.address);
      expect(finalBalance).to.be.gt(initialBalance);

      expect(await crowdfunding.getContribution(1, user1.address)).to.equal(0);
    });

    it("Should revert refund if goal was reached", async function () {
      const { crowdfunding, user1 } = await deployCrowdfundingFixture();

      await crowdfunding.createCampaign("Test", "Description", ethers.parseEther("10"), 30);

      await crowdfunding.connect(user1).contribute(1, { value: ethers.parseEther("10") });

      await time.increase(31 * 24 * 60 * 60);

      await expect(
        crowdfunding.connect(user1).refund(1)
      ).to.be.revertedWith("Campaign was successful, no refunds");
    });

    it("Should revert refund before deadline", async function () {
      const { crowdfunding, user1 } = await deployCrowdfundingFixture();

      await crowdfunding.createCampaign("Test", "Description", ethers.parseEther("10"), 30);

      await crowdfunding.connect(user1).contribute(1, { value: ethers.parseEther("5") });

      await expect(
        crowdfunding.connect(user1).refund(1)
      ).to.be.revertedWith("Campaign still active");
    });

    it("Should revert refund with no contribution", async function () {
      const { crowdfunding, user1 } = await deployCrowdfundingFixture();

      await crowdfunding.createCampaign("Test", "Description", ethers.parseEther("10"), 30);

      await time.increase(31 * 24 * 60 * 60);

      await expect(
        crowdfunding.connect(user1).refund(1)
      ).to.be.revertedWith("No contribution to refund");
    });

    it("Should allow multiple users to get refunds", async function () {
      const { crowdfunding, user1, user2, user3 } = await deployCrowdfundingFixture();

      await crowdfunding.createCampaign("Test", "Description", ethers.parseEther("10"), 30);

      await crowdfunding.connect(user1).contribute(1, { value: ethers.parseEther("2") });
      await crowdfunding.connect(user2).contribute(1, { value: ethers.parseEther("3") });
      await crowdfunding.connect(user3).contribute(1, { value: ethers.parseEther("1") });

      await time.increase(31 * 24 * 60 * 60);

      await crowdfunding.connect(user1).refund(1);
      await crowdfunding.connect(user2).refund(1);
      await crowdfunding.connect(user3).refund(1);

      expect(await crowdfunding.getContribution(1, user1.address)).to.equal(0);
      expect(await crowdfunding.getContribution(1, user2.address)).to.equal(0);
      expect(await crowdfunding.getContribution(1, user3.address)).to.equal(0);
    });

    it("Should prevent double refund", async function () {
      const { crowdfunding, user1 } = await deployCrowdfundingFixture();

      await crowdfunding.createCampaign("Test", "Description", ethers.parseEther("10"), 30);

      await crowdfunding.connect(user1).contribute(1, { value: ethers.parseEther("5") });

      await time.increase(31 * 24 * 60 * 60);

      await crowdfunding.connect(user1).refund(1);

      await expect(
        crowdfunding.connect(user1).refund(1)
      ).to.be.revertedWith("No contribution to refund");
    });
  });

  describe("View Functions", function () {
    it("Should return correct campaign details", async function () {
      const { crowdfunding, owner } = await deployCrowdfundingFixture();

      const goalAmount = ethers.parseEther("20");
      await crowdfunding.createCampaign("View Test", "Testing views", goalAmount, 60);

      const campaign = await crowdfunding.getCampaign(1);

      expect(campaign.creator).to.equal(owner.address);
      expect(campaign.title).to.equal("View Test");
      expect(campaign.goalAmount).to.equal(goalAmount);
    });

    it("Should return correct goal status", async function () {
      const { crowdfunding, user1 } = await deployCrowdfundingFixture();

      await crowdfunding.createCampaign("Test", "Description", ethers.parseEther("10"), 30);

      expect(await crowdfunding.isGoalReached(1)).to.equal(false);

      await crowdfunding.connect(user1).contribute(1, { value: ethers.parseEther("10") });

      expect(await crowdfunding.isGoalReached(1)).to.equal(true);
    });

    it("Should return all campaign IDs", async function () {
      const { crowdfunding } = await deployCrowdfundingFixture();

      await crowdfunding.createCampaign("Campaign 1", "Desc 1", ethers.parseEther("5"), 30);
      await crowdfunding.createCampaign("Campaign 2", "Desc 2", ethers.parseEther("10"), 60);
      await crowdfunding.createCampaign("Campaign 3", "Desc 3", ethers.parseEther("15"), 90);

      const ids = await crowdfunding.getAllCampaignIds();

      expect(ids.length).to.equal(3);
      expect(ids[0]).to.equal(1);
      expect(ids[1]).to.equal(2);
      expect(ids[2]).to.equal(3);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle exact goal amount contribution", async function () {
      const { crowdfunding, user1 } = await deployCrowdfundingFixture();

      const goalAmount = ethers.parseEther("10");
      await crowdfunding.createCampaign("Test", "Description", goalAmount, 30);

      await crowdfunding.connect(user1).contribute(1, { value: goalAmount });

      expect(await crowdfunding.isGoalReached(1)).to.equal(true);
    });

    it("Should handle contributions exceeding goal", async function () {
      const { crowdfunding, user1 } = await deployCrowdfundingFixture();

      await crowdfunding.createCampaign("Test", "Description", ethers.parseEther("10"), 30);

      await crowdfunding.connect(user1).contribute(1, { value: ethers.parseEther("15") });

      const campaign = await crowdfunding.getCampaign(1);
      expect(campaign.amountRaised).to.equal(ethers.parseEther("15"));
      expect(await crowdfunding.isGoalReached(1)).to.equal(true);
    });

    it("Should handle minimum duration (1 day)", async function () {
      const { crowdfunding } = await deployCrowdfundingFixture();

      await expect(
        crowdfunding.createCampaign("Test", "Description", ethers.parseEther("10"), 1)
      ).to.not.be.reverted;
    });

    it("Should handle maximum duration (365 days)", async function () {
      const { crowdfunding } = await deployCrowdfundingFixture();

      await expect(
        crowdfunding.createCampaign("Test", "Description", ethers.parseEther("10"), 365)
      ).to.not.be.reverted;
    });
  });
});
