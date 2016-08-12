import * as chai from "chai";
import * as Promise from "bluebird";
import { ITestContext, TestInMemoryContext, TestCloudStoreContext } from "./testContext";
import { BasicTests } from "./test-basics";
import { CachingTests } from "./test-caching";
import { TransactionTests } from "./test-transactions";
var should = chai.should();
var dataStoreObject = {};

var projectId = process.env["GPROJ"];

// BasicTests("memory", () => Promise.resolve(new TestInMemoryContext(dataStoreObject)));
// CachingTests("memory", (timeout) => Promise.resolve(new TestInMemoryContext(dataStoreObject, timeout)));
// TransactionTests("memory", () => Promise.resolve(new TestInMemoryContext(dataStoreObject)));

// it("validate-google-project-id", function () {
//     should.exist(projectId, "You need to specify google project id to run google tests. Something like 'GPROJ=mygoogleproj mocha -t 4000'");
// });

// if (projectId) {
//     BasicTests("gcloud-store", () => Promise.resolve(new TestCloudStoreContext(projectId)));
//     CachingTests("gcloud-store", (timeout) => Promise.resolve(new TestCloudStoreContext(projectId, timeout)));
//     TransactionTests("gcloud-store", () => Promise.resolve(new TestCloudStoreContext(projectId)));
// }

TransactionTests("gcloud-store", () => Promise.resolve(new TestCloudStoreContext(projectId)));