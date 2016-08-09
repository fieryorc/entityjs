import * as chai from "chai";
import * as Promise from "bluebird";
import { ITestContext, TestInMemoryContext, TestCloudStoreContext } from "./test-context";
import { BasicTests } from "./test-basics";
import { CachingTests } from "./test-caching";
var should = chai.should();

BasicTests("memory", () => Promise.resolve(new TestInMemoryContext()));
CachingTests("memory", (timeout) => Promise.resolve(new TestInMemoryContext(timeout)));

var projectId = process.env["GPROJ"];
it("validate-google-project-id", function () {
    should.exist(projectId, "You need to specify google project id to run google tests. Something like 'GPROJ=mygoogleproj mocha -t 4000'");
});

if (projectId) {
    BasicTests("gcloud-store", () => Promise.resolve(new TestCloudStoreContext(projectId)));
    CachingTests("gcloud-store", (timeout) => Promise.resolve(new TestCloudStoreContext(projectId, timeout)));
} 
