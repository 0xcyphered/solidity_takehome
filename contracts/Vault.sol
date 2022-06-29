pragma solidity 0.8.14;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./ERC20.sol";

contract Vault is Ownable {
    struct Grant {
        address token;
        uint256 amount;
        uint256 start;
        uint256 unlockAt;
        bool claimed;
    }

    mapping(address => mapping(address => Grant)) grants;

    error NotFound();
    error AlreadyGranted();
    error AlreadyClaimed();
    error InvalidLockTime();
    error AlreadyPassedTime();
    error UnsucsessTransferERC20();
    error NotClaimableYet(uint256 remainseconds);

    event GrantAdded(
        address token,
        address recipient,
        uint256 amount,
        uint256 unlockAt
    );
    event GrantRemoved(address recipient);
    event GrantClaimed(address funder, address token, uint256 amount);
    event GrantUnlockChanged(
        address recipient,
        uint256 oldTime,
        uint256 newTime
    );

    function addGrant(
        address token,
        address recipient,
        uint256 amount,
        uint256 unlockAt
    ) external {
        uint256 start = block.timestamp;
        require(unlockAt >= start, "Invalid unlock time");
        if (unlockAt < start) {
            revert InvalidLockTime();
        }
        Grant storage grant = grants[msg.sender][recipient];

        if (!grant.claimed && grant.start > 0) {
            revert AlreadyGranted();
        }

        bool sucess = ERC20(token).transferFrom(
            msg.sender,
            address(this),
            amount
        );

        if (!sucess) {
            revert UnsucsessTransferERC20();
        }

        grant.token = token;
        grant.amount = amount;
        grant.start = start;
        grant.unlockAt = unlockAt;
        grant.claimed = false;
        emit GrantAdded(token, recipient, amount, unlockAt);
    }

    function removeGrant(address recipient) external {
        Grant storage grant = grants[msg.sender][recipient];
        if (grant.claimed || grant.start == 0) {
            revert NotFound();
        }

        bool sucess = ERC20(grant.token).transfer(msg.sender, grant.amount);
        if (!sucess) {
            revert UnsucsessTransferERC20();
        }

        grant.start = 0;
        emit GrantRemoved(recipient);
    }

    function claimGrant(address funder) external {
        Grant storage grant = grants[funder][msg.sender];
        if (grant.start == 0) {
            revert NotFound();
        }
        if (grant.claimed) {
            revert AlreadyClaimed();
        }
        if (grant.unlockAt > block.timestamp) {
            revert NotClaimableYet(grant.unlockAt - block.timestamp);
        }

        bool sucess = ERC20(grant.token).transfer(msg.sender, grant.amount);
        if (!sucess) {
            revert UnsucsessTransferERC20();
        }

        grant.claimed = true;
        emit GrantClaimed(funder, grant.token, grant.amount);
    }

    function decreaseLockTime(address recipient, uint256 unlockAt) external {
        Grant storage grant = grants[msg.sender][recipient];
        if (grant.start == 0) {
            revert NotFound();
        }
        if (grant.claimed) {
            revert AlreadyClaimed();
        }
        uint256 oldTs = grant.unlockAt;
        if (grant.unlockAt < block.timestamp) {
            revert AlreadyPassedTime();
        }
        if (unlockAt < block.timestamp) {
            revert InvalidLockTime();
        }

        grant.unlockAt = unlockAt;
        emit GrantUnlockChanged(recipient, oldTs, unlockAt);
    }
}
