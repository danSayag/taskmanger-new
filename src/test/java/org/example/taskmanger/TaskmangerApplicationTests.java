package org.example.taskmanger;

import org.junit.platform.suite.api.IncludeEngines;
import org.junit.platform.suite.api.SelectPackages;
import org.junit.platform.suite.api.Suite;
import org.junit.platform.suite.api.SuiteDisplayName;

// Click Run on this class in the IDE to run every test in the project.
// (`./mvnw test` runs them all too, without going through this suite.)
@Suite
@SuiteDisplayName("All tests")
@SelectPackages("org.example.taskmanger")
@IncludeEngines("junit-jupiter")
class TaskmangerApplicationTests {
}
