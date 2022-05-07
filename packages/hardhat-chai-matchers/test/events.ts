import { expect, AssertionError } from "chai";
import { BigNumber, Contract, ethers } from "ethers";

import { useEnvironment, useEnvironmentWithNode } from "./helpers";

describe(".to.emit (contract events)", () => {
  let contract: Contract;
  let otherContract: Contract;

  describe("with the in-process hardhat network", function () {
    useEnvironment("hardhat-project");

    runTests();
  });

  describe("connected to a hardhat node", function () {
    useEnvironmentWithNode("hardhat-project");

    runTests();
  });

  function runTests() {
    beforeEach(async function () {
      otherContract = await (
        await this.hre.ethers.getContractFactory("AnotherContract")
      ).deploy();
      contract = await (
        await this.hre.ethers.getContractFactory("Events")
      ).deploy(otherContract.address);
    });

    it("Should fail when expecting an event that's not in the contract", async function () {
      await expect(
        expect(contract.doNotEmit()).to.emit(contract, "NonexistentEvent")
      ).to.be.eventually.rejectedWith(
        AssertionError,
        "Expected event \"NonexistentEvent\" to be emitted, but it doesn't exist in the contract. Please make sure you've compiled its latest version before running the test."
      );
    });

    it("Should fail when expecting an event that's not in the contract to NOT be emitted", async function () {
      await expect(
        expect(contract.doNotEmit()).not.to.emit(contract, "NonexistentEvent")
      ).to.be.eventually.rejectedWith(
        AssertionError,
        "WARNING: Expected event \"NonexistentEvent\" NOT to be emitted. The event wasn't emitted because it doesn't exist in the contract. Please make sure you've compiled its latest version before running the test."
      );
    });

    it("Should detect events without arguments", async function () {
      await expect(contract.emitWithoutArgs()).to.emit(contract, "WithoutArgs");
    });

    it("Should fail when expecting an event that wasn't emitted", async function () {
      await expect(
        expect(contract.doNotEmit()).to.emit(contract, "WithoutArgs")
      ).to.be.eventually.rejectedWith(
        AssertionError,
        'Expected event "WithoutArgs" to be emitted, but it wasn\'t'
      );
    });

    it("Should fail when expecting a specific event NOT to be emitted but it WAS", async function () {
      await expect(
        expect(contract.emitWithoutArgs()).to.not.emit(contract, "WithoutArgs")
      ).to.be.eventually.rejectedWith(
        AssertionError,
        'Expected event "WithoutArgs" NOT to be emitted, but it was'
      );
    });

    describe(".withArgs", function () {
      it.skip("Should fail when used with .not.", async function () {
        await expect(
          expect(contract.emitUint(1))
            .not.to.emit(contract, "WithUintArg")
            .withArgs(1)
        ).to.be.eventually.rejectedWith(
          AssertionError,
          "Do not combine .not. with .withArgs()"
        );
      });

      describe("with a uint argument", function () {
        it("Should match the argument", async function () {
          await expect(contract.emitUint(1))
            .to.emit(contract, "WithUintArg")
            .withArgs(1);
        });

        it("Should fail when the input argument doesn't match the event argument", async function () {
          await expect(
            expect(contract.emitUint(1))
              .to.emit(contract, "WithUintArg")
              .withArgs(2)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            "expected 1 to equal 2"
          );
        });

        it("Should fail when too many arguments are given", async function () {
          await expect(
            expect(contract.emitUint(1))
              .to.emit(contract, "WithUintArg")
              .withArgs(1, 3)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            'Expected "WithUintArg" event to have 2 argument(s), but it has 1'
          );
        });
      });

      const string1 = "string1";
      const string1Bytes = ethers.utils.hexlify(
        ethers.utils.toUtf8Bytes(string1)
      );
      const string2 = "string2";
      const string2Bytes = ethers.utils.hexlify(
        ethers.utils.toUtf8Bytes(string2)
      );

      describe("with a string argument", function () {
        it("Should match the argument", async function () {
          await expect(contract.emitString("string"))
            .to.emit(contract, "WithStringArg")
            .withArgs("string");
        });

        it("Should fail when the input argument doesn't match the event argument", async function () {
          await expect(
            expect(contract.emitString(string1))
              .to.emit(contract, "WithStringArg")
              .withArgs(string2)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `expected '${string1}' to equal '${string2}'`
          );
        });
      });

      describe("with an indexed string argument", function () {
        it("Should match the argument", async function () {
          await expect(contract.emitIndexedString(string1))
            .to.emit(contract, "WithIndexedStringArg")
            .withArgs(string1);
        });

        it("Should fail when the input argument doesn't match the event argument", async function () {
          // this error message is terrible. should improve the implementation.
          await expect(
            expect(contract.emitIndexedString(string1))
              .to.emit(contract, "WithIndexedStringArg")
              .withArgs(string2)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `expected '${ethers.utils.keccak256(
              string1Bytes
            )}' to be one of [ Array(2) ]`
          );
        });

        it("Should match the event argument with a hash value", async function () {
          await expect(contract.emitIndexedString(string1))
            .to.emit(contract, "WithIndexedStringArg")
            .withArgs(ethers.utils.keccak256(string1Bytes));
        });

        it("Should fail when trying to match the event argument with an incorrect hash value", async function () {
          const expectedHash = ethers.utils.keccak256(string1Bytes);
          const incorrectHash = ethers.utils.keccak256(string2Bytes);
          await expect(
            expect(contract.emitIndexedString(string1))
              .to.emit(contract, "WithIndexedStringArg")
              .withArgs(incorrectHash)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `expected '${expectedHash}' to be one of [ Array(2) ]`
          );
        });
      });

      describe("with a bytes argument", function () {
        it("Should match the argument", async function () {
          await expect(contract.emitBytes(string1Bytes))
            .to.emit(contract, "WithBytesArg")
            .withArgs(string1Bytes);
        });

        it("Should fail when the input argument doesn't match the event argument", async function () {
          await expect(
            expect(contract.emitBytes(string2Bytes))
              .to.emit(contract, "WithBytesArg")
              .withArgs(string1Bytes)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `expected '${string2Bytes}' to equal '${string1Bytes}'`
          );
        });
      });

      describe("with an indexed bytes argument", function () {
        it("Should match the argument", async function () {
          await expect(contract.emitIndexedBytes(string1Bytes))
            .to.emit(contract, "WithIndexedBytesArg")
            .withArgs(string1Bytes);
        });

        it("Should fail when the input argument doesn't match the event argument", async function () {
          await expect(
            expect(contract.emitIndexedBytes(string2Bytes))
              .to.emit(contract, "WithIndexedBytesArg")
              .withArgs(string1Bytes)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `expected '${ethers.utils.keccak256(
              string2Bytes
            )}' to be one of [ Array(2) ]`
          );
        });

        it("Should match the event argument with a hash value", async function () {
          await expect(contract.emitIndexedBytes(string1Bytes))
            .to.emit(contract, "WithIndexedBytesArg")
            .withArgs(ethers.utils.keccak256(string1Bytes));
        });
      });

      const string1Bytes32 = ethers.utils.zeroPad(string1Bytes, 32);
      const string2Bytes32 = ethers.utils.zeroPad(string2Bytes, 32);
      describe("with a bytes32 argument", function () {
        it("Should match the argument", async function () {
          await expect(contract.emitBytes32(string1Bytes32))
            .to.emit(contract, "WithBytes32Arg")
            .withArgs(string1Bytes32);
        });

        it("Should fail when the input argument doesn't match the event argument", async function () {
          await expect(
            expect(contract.emitBytes32(string2Bytes32))
              .to.emit(contract, "WithBytes32Arg")
              .withArgs(string1Bytes32)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `expected '${ethers.utils.hexlify(
              string2Bytes32
            )}' to equal '${ethers.utils.hexlify(string1Bytes32)}'`
          );
        });
      });

      describe("with an indexed bytes32 argument", function () {
        it("Should match the argument", async function () {
          await expect(contract.emitIndexedBytes32(string1Bytes32))
            .to.emit(contract, "WithIndexedBytes32Arg")
            .withArgs(string1Bytes32);
        });

        it("Should fail when the input argument doesn't match the event argument", async function () {
          await expect(
            expect(contract.emitIndexedBytes32(string2Bytes32))
              .to.emit(contract, "WithIndexedBytes32Arg")
              .withArgs(string1Bytes32)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `expected '${ethers.utils.hexlify(
              string2Bytes32
            )}' to equal '${ethers.utils.hexlify(string1Bytes32)}'`
          );
        });

        it("Should match the event argument with a hash value", async function () {
          await expect(contract.emitIndexedBytes32(string1Bytes32))
            .to.emit(contract, "WithIndexedBytes32Arg")
            .withArgs(string1Bytes32);
        });
      });

      describe("with a uint array argument", function () {
        it("Should succeed when expectations are met", async function () {
          await expect(contract.emitUintArray(1, 2))
            .to.emit(contract, "WithUintArray")
            .withArgs([1, 2]);
        });

        it("Should succeed when expectations are met with BigNumber", async function () {
          await expect(contract.emitUintArray(1, 2))
            .to.emit(contract, "WithUintArray")
            .withArgs([BigNumber.from(1), BigNumber.from(2)]);
        });

        it("Should fail when expectations are not met", async function () {
          await expect(
            expect(contract.emitUintArray(1, 2))
              .to.emit(contract, "WithUintArray")
              .withArgs([3, 4])
          ).to.be.eventually.rejectedWith(
            AssertionError,
            "expected 1 to equal 3"
          );
        });
      });

      describe("with a bytes32 array argument", function () {
        it("Should succeed when expectations are met", async function () {
          await expect(
            contract.emitBytes32Array(
              `0x${"aa".repeat(32)}`,
              `0x${"bb".repeat(32)}`
            )
          )
            .to.emit(contract, "WithBytes32Array")
            .withArgs([`0x${"aa".repeat(32)}`, `0x${"bb".repeat(32)}`]);
        });

        it("Should fail when expectations are not met", async function () {
          await expect(
            expect(
              contract.emitBytes32Array(
                `0x${"aa".repeat(32)}`,
                `0x${"bb".repeat(32)}`
              )
            )
              .to.emit(contract, "WithBytes32Array")
              .withArgs([`0x${"cc".repeat(32)}`, `0x${"dd".repeat(32)}`])
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `expected '0x${"aa".repeat(32)}' to equal '0x${"cc".repeat(32)}'`
          );
        });
      });

      describe("with a struct argument", function () {
        it("Should succeed when expectations are met", async function () {
          await expect(contract.emitStruct(1, 2))
            .to.emit(contract, "WithStructArg")
            .withArgs([1, 2]);
        });

        it("Should fail when expectations are not met", async function () {
          await expect(
            expect(contract.emitStruct(1, 2))
              .to.emit(contract, "WithStructArg")
              .withArgs([3, 4])
          ).to.be.eventually.rejectedWith(
            AssertionError,
            "expected 1 to equal 3"
          );
        });
      });

      describe("with multiple arguments", function () {
        it("Should successfully match the arguments", async function () {
          await expect(contract.emitTwoUints(1, 2))
            .to.emit(contract, "WithTwoUintArgs")
            .withArgs(1, 2);
        });

        it("Should fail when the first argument isn't matched", async function () {
          await expect(
            expect(contract.emitTwoUints(1, 2))
              .to.emit(contract, "WithTwoUintArgs")
              .withArgs(2, 2)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            "expected 1 to equal 2"
          );
        });

        it("Should fail when the second argument isn't matched", async function () {
          await expect(
            expect(contract.emitTwoUints(1, 2))
              .to.emit(contract, "WithTwoUintArgs")
              .withArgs(1, 1)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            "expected 2 to equal 1"
          );
        });

        it("Should fail when too many arguments are supplied", async function () {
          await expect(
            expect(contract.emitTwoUints(1, 2))
              .to.emit(contract, "WithTwoUintArgs")
              .withArgs(1, 2, 3, 4)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            'Expected "WithTwoUintArgs" event to have 4 argument(s), but it has 2'
          );
        });

        it("Should fail when too few arguments are supplied", async function () {
          await expect(
            expect(contract.emitTwoUints(1, 2))
              .to.emit(contract, "WithTwoUintArgs")
              .withArgs(1)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            'Expected "WithTwoUintArgs" event to have 1 argument(s), but it has 2'
          );
        });
      });
    });

    describe("With one call that emits two separate events", function () {
      it("Should successfully catch each event independently", async function () {
        await expect(contract.emitUintAndString(1, "a string")).to.emit(
          contract,
          "WithUintArg"
        );
        await expect(contract.emitUintAndString(1, "a string")).to.emit(
          contract,
          "WithStringArg"
        );
      });
      describe("When detecting two events from one call (chaining)", async function () {
        it("Should succeed when both expected events are indeed emitted", async function () {
          await expect(contract.emitUintAndString(1, "a string"))
            .to.emit(contract, "WithUintArg")
            .and.to.emit(contract, "WithStringArg");
        });
        it.skip("Should succeed when the expected event is emitted and the unexpected event is not", async function () {
          await expect(contract.emitWithoutArgs())
            .to.emit(contract, "WithoutArgs")
            .and.not.to.emit(otherContract, "WithUintArg");
        });
        describe("When one of the expected events is emitted and the other is not", function () {
          it("Should fail when the first expected event is emitted but the second is not", async function () {
            await expect(
              expect(contract.emitUint(1))
                .to.emit(contract, "WithUintArg")
                .and.to.emit(contract, "WithStringArg")
            ).to.be.eventually.rejectedWith(
              AssertionError,
              'Expected event "WithStringArg" to be emitted, but it wasn\'t'
            );
          });
          it.skip("Should fail when the second expected event is emitted but the first is not", async function () {
            await expect(
              expect(contract.emitUint(1))
                .to.emit(contract, "WithStringArg")
                .and.to.emit(contract, "WithUintArg")
            ).to.be.eventually.rejectedWith(
              AssertionError,
              'Expected event "WithStringArg" to be emitted, but it wasn\'t'
            );
          });
        });
        describe("When specifying .withArgs()", async function () {
          it("Should pass when expecting the correct args from the first event", async function () {
            await expect(contract.emitUintAndString(1, "a string"))
              .to.emit(contract, "WithUintArg")
              .withArgs(1)
              .and.to.emit(contract, "WithStringArg");
          });
          it("Should pass when expecting the correct args from the second event", async function () {
            await expect(contract.emitUintAndString(1, "a string"))
              .to.emit(contract, "WithUintArg")
              .and.to.emit(contract, "WithStringArg")
              .withArgs("a string");
          });
          it.skip("Should pass when expecting the correct args from both events", async function () {
            await expect(contract.emitUintAndString(1, "a string"))
              .to.emit(contract, "WithUintArg")
              .withArgs(1)
              .and.to.emit(contract, "WithStringArg")
              .withArgs("a string");
          });
          it.skip("Should fail when expecting the wrong argument value for the first event", async function () {
            await expect(
              expect(contract.emitUintAndString(1, "a string"))
                .to.emit(contract, "WithUintArg")
                .withArgs(2)
                .and.to.emit(contract, "WithStringArg")
            ).to.be.eventually.rejectedWith(
              AssertionError,
              "expected 1 to equal 2"
            );
          });
          it("Should fail when expecting the wrong argument value for the second event", async function () {
            await expect(
              expect(contract.emitUintAndString(1, "a string"))
                .to.emit(contract, "WithUintArg")
                .and.to.emit(contract, "WithStringArg")
                .withArgs("a different string")
            ).to.be.eventually.rejectedWith(
              AssertionError,
              "expected 'a string' to equal 'a different string'"
            );
          });
          it.skip("Should fail when expecting too many arguments from the first event", async function () {
            await expect(
              expect(contract.emitUintAndString(1, "a string"))
                .to.emit(contract, "WithUintArg")
                .withArgs(1, 2)
                .and.to.emit(contract, "WithStringArg")
            ).to.be.eventually.rejectedWith(
              AssertionError,
              'Expected "WithUintArg" event to have 2 argument(s), but it has 1'
            );
          });
          it.skip("Should fail when expecting too many arguments from the second event", async function () {
            await expect(
              expect(contract.emitUintAndString(1, "a string"))
                .to.emit(contract, "WithUintArg")
                .and.to.emit(contract, "WithStringArg")
                .withArgs("a different string", "yet another string")
            ).to.be.eventually.rejectedWith(
              AssertionError,
              'Expected "WithStringArg" event to have 2 argument(s), but it has 1'
            );
          });
          it.skip("Should fail when expecting too few arguments from the first event", async function () {
            await expect(
              expect(
                contract.emitTwoUintsAndTwoStrings(
                  1,
                  2,
                  "a string",
                  "another string"
                )
              )
                .to.emit(contract, "WithTwoUintArgs")
                .withArgs(1)
                .and.to.emit(contract, "WithTwoStringArgs")
            ).to.be.eventually.rejectedWith(
              AssertionError,
              'Expected "WithTwoUintArgs" event to have 1 argument(s), but it has 2'
            );
          });
          it("Should fail when expecting too few arguments from the second event", async function () {
            await expect(
              expect(
                contract.emitTwoUintsAndTwoStrings(
                  1,
                  2,
                  "a string",
                  "another string"
                )
              )
                .to.emit(contract, "WithTwoUintArgs")
                .and.to.emit(contract, "WithTwoStringArgs")
                .withArgs("a string")
            ).to.be.eventually.rejectedWith(
              AssertionError,
              'Expected "WithTwoStringArgs" event to have 1 argument(s), but it has 2'
            );
          });
        });

        describe("With a contract that emits the same event twice but with different arguments", function () {
          it("Should pass when expectations are met", async function () {
            await expect(contract.emitUintTwice(1, 2))
              .to.emit(contract, "WithUintArg")
              .withArgs(1)
              .and.to.emit(contract, "WithUintArg")
              .withArgs(2);
          });

          it.skip("Should fail when the first event's argument is not matched", async function () {
            await expect(
              expect(contract.emitUintTwice(1, 2))
                .to.emit(contract, "WithUintArg")
                .withArgs(2)
                .and.to.emit(contract, "WithUintArg")
                .withArgs(2)
            ).to.be.eventually.rejectedWith(
              AssertionError,
              "Expected 2 to equal 1"
            );
          });

          it.skip("Should fail when the second event's argument is not matched", async function () {
            await expect(
              expect(contract.emitUintTwice(1, 2))
                .to.emit(contract, "WithUintArg")
                .withArgs(1)
                .and.to.emit(contract, "WithUintArg")
                .withArgs(1)
            ).to.be.eventually.rejectedWith(
              AssertionError,
              "Expected 1 to equal 2"
            );
          });

          it("Should fail when none of the emitted events match the given argument", async function () {
            await expect(
              expect(contract.emitUintTwice(1, 2))
                .to.emit(contract, "WithUintArg")
                .withArgs(3)
            ).to.be.eventually.rejectedWith(
              AssertionError,
              'Specified args not emitted in any of 2 emitted "WithUintArg" events'
            );
          });
        });
      });
    });

    describe("When nested events are emitted", function () {
      describe("With the nested event emitted from the same contract", function () {
        it("Should pass when the expected event is emitted", async function () {
          await expect(contract.emitNestedUintFromSameContract(1))
            .to.emit(contract, "WithUintArg")
            .withArgs(1);
        });

        it("Should fail when the expected event is emitted", async function () {
          await expect(
            expect(contract.emitNestedUintFromSameContract(1)).to.emit(
              contract,
              "WithStringArg"
            )
          ).to.be.eventually.rejectedWith(
            AssertionError,
            'Expected event "WithStringArg" to be emitted, but it wasn\'t'
          );
        });
      });

      describe("With the nested event emitted from a different contract", function () {
        it("Should pass when the expected event is emitted", async function () {
          await expect(contract.emitNestedUintFromAnotherContract(1))
            .to.emit(otherContract, "WithUintArg")
            .withArgs(1);
        });

        it("Should pass when the expected event is emitted", async function () {
          await expect(
            expect(contract.emitNestedUintFromAnotherContract(1))
              .not.to.emit(otherContract, "WithUintArg")
              .withArgs(1)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            'Expected event "WithUintArg" NOT to be emitted, but it was'
          );
        });
      });
    });

    it("With executed transaction", async () => {
      const tx = await contract.emitWithoutArgs();
      await expect(tx).to.emit(contract, "WithoutArgs");
    });

    it("With transaction hash", async () => {
      const tx = await contract.emitWithoutArgs();
      await expect(tx.hash).to.emit(contract, "WithoutArgs");
    });
  }
});
