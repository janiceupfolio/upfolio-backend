"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log("Adding dashboard-specific performance indexes...");

    // ===========================================
    // USER TABLE DASHBOARD INDEXES
    // ===========================================
    
    // Composite index for role + center_id + deletedAt (most common dashboard query pattern)
    await queryInterface.addIndex("tbl_user", ["role", "center_id", "deletedAt"], {
      name: "idx_user_role_center_deleted",
    });

    // Composite index for role + center_id + createdAt (for monthly/weekly counts)
    await queryInterface.addIndex("tbl_user", ["role", "center_id", "createdAt"], {
      name: "idx_user_role_center_created",
    });

    // Composite index for role + center_id + createdAt + deletedAt (for time-based filtering)
    await queryInterface.addIndex("tbl_user", ["role", "center_id", "createdAt", "deletedAt"], {
      name: "idx_user_role_center_created_deleted",
    });

    // ===========================================
    // ASSESSMENT TABLE DASHBOARD INDEXES
    // ===========================================
    
    // Composite index for center_id + qualification_id + deletedAt (for qualification filtering)
    await queryInterface.addIndex("tbl_assessment", ["center_id", "qualification_id", "deletedAt"], {
      name: "idx_assessment_center_qualification_deleted",
    });

    // Composite index for center_id + assessment_status + deletedAt (for status filtering)
    await queryInterface.addIndex("tbl_assessment", ["center_id", "assessment_status", "deletedAt"], {
      name: "idx_assessment_center_status_deleted",
    });

    // Composite index for center_id + createdAt + deletedAt (for time-based filtering)
    await queryInterface.addIndex("tbl_assessment", ["center_id", "createdAt", "deletedAt"], {
      name: "idx_assessment_center_created_deleted",
    });

    // Composite index for center_id + qualification_id + assessment_status + deletedAt (for complex filtering)
    await queryInterface.addIndex("tbl_assessment", ["center_id", "qualification_id", "assessment_status", "deletedAt"], {
      name: "idx_assessment_center_qualification_status_deleted",
    });

    // Composite index for center_id + qualification_id + createdAt + deletedAt (for time-based qualification filtering)
    await queryInterface.addIndex("tbl_assessment", ["center_id", "qualification_id", "createdAt", "deletedAt"], {
      name: "idx_assessment_center_qualification_created_deleted",
    });

    // ===========================================
    // USER_QUALIFICATION TABLE DASHBOARD INDEXES
    // ===========================================
    
    // Composite index for is_signed_off + deletedAt (for qualification filtering)
    await queryInterface.addIndex("tbl_user_qualification", ["is_signed_off", "deletedAt"], {
      name: "idx_user_qualification_signed_off_deleted",
    });

    // Composite index for qualification_id + is_signed_off + deletedAt (for assessment qualification filtering)
    await queryInterface.addIndex("tbl_user_qualification", ["qualification_id", "is_signed_off", "deletedAt"], {
      name: "idx_user_qualification_qualification_signed_off_deleted",
    });

    // ===========================================
    // QUALIFICATIONS TABLE DASHBOARD INDEXES
    // ===========================================
    
    // Composite index for status + createdAt + deletedAt (for monthly qualification counts)
    await queryInterface.addIndex("tbl_qualifications", ["status", "createdAt", "deletedAt"], {
      name: "idx_qualifications_status_created_deleted",
    });

    // ===========================================
    // ACTIVITY TABLE DASHBOARD INDEXES
    // ===========================================
    
    // Composite index for center_id + createdAt (for recent activity ordering)
    await queryInterface.addIndex("tbl_activity", ["center_id", "createdAt"], {
      name: "idx_activity_center_created",
    });

    // ===========================================
    // MODULE_RECORDS TABLE DASHBOARD INDEXES
    // ===========================================
    
    // Composite index for center_id + createdAt (for recent resource ordering)
    await queryInterface.addIndex("tbl_module_records", ["center_id", "createdAt"], {
      name: "idx_module_records_center_created",
    });

    console.log("Dashboard performance indexes added successfully!");
  },

  async down(queryInterface, Sequelize) {
    console.log("Removing dashboard performance indexes...");

    const indexes = [
      // User table indexes
      "idx_user_role_center_deleted",
      "idx_user_role_center_created", 
      "idx_user_role_center_created_deleted",
      
      // Assessment table indexes
      "idx_assessment_center_qualification_deleted",
      "idx_assessment_center_status_deleted",
      "idx_assessment_center_created_deleted",
      "idx_assessment_center_qualification_status_deleted",
      "idx_assessment_center_qualification_created_deleted",
      
      // User qualification table indexes
      "idx_user_qualification_signed_off_deleted",
      "idx_user_qualification_qualification_signed_off_deleted",
      
      // Qualifications table indexes
      "idx_qualifications_status_created_deleted",
      
      // Activity table indexes
      "idx_activity_center_created",
      
      // Module records table indexes
      "idx_module_records_center_created"
    ];

    for (const indexName of indexes) {
      try {
        // Determine table name from index name
        let tableName = "";
        if (indexName.includes("user_")) tableName = "tbl_user";
        else if (indexName.includes("assessment_")) tableName = "tbl_assessment";
        else if (indexName.includes("qualification")) {
          if (indexName.includes("user_qualification")) tableName = "tbl_user_qualification";
          else tableName = "tbl_qualifications";
        }
        else if (indexName.includes("activity")) tableName = "tbl_activity";
        else if (indexName.includes("module_records")) tableName = "tbl_module_records";

        await queryInterface.removeIndex(tableName, indexName);
      } catch (error) {
        console.log(`Warning: Could not remove index ${indexName}: ${error.message}`);
      }
    }

    console.log("Dashboard performance indexes removed successfully!");
  },
};
