'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    console.log("Adding additional dashboard performance indexes...");

    // ===========================================
    // USER_ASSESSOR TABLE DASHBOARD INDEXES
    // ===========================================
    
    // Composite index for assessor_id + status + deletedAt (for assessor dashboard queries)
    await queryInterface.addIndex("tbl_user_assessor", ["assessor_id", "status", "deletedAt"], {
      name: "idx_user_assessor_assessor_status_deleted",
    });

    // Composite index for assessor_id + createdAt + deletedAt (for time-based assessor queries)
    await queryInterface.addIndex("tbl_user_assessor", ["assessor_id", "createdAt", "deletedAt"], {
      name: "idx_user_assessor_assessor_created_deleted",
    });

    // Composite index for assessor_id + status + createdAt + deletedAt (for complex assessor filtering)
    await queryInterface.addIndex("tbl_user_assessor", ["assessor_id", "status", "createdAt", "deletedAt"], {
      name: "idx_user_assessor_assessor_status_created_deleted",
    });

    // ===========================================
    // ASSESSMENT TABLE ADDITIONAL INDEXES
    // ===========================================
    
    // Composite index for assessor_id + assessment_status + deletedAt (for assessor dashboard)
    await queryInterface.addIndex("tbl_assessment", ["assessor_id", "assessment_status", "deletedAt"], {
      name: "idx_assessment_assessor_status_deleted",
    });

    // Composite index for assessor_id + createdAt + deletedAt (for assessor time-based queries)
    await queryInterface.addIndex("tbl_assessment", ["assessor_id", "createdAt", "deletedAt"], {
      name: "idx_assessment_assessor_created_deleted",
    });

    // Composite index for assessor_id + assessment_status + createdAt + deletedAt (for complex assessor filtering)
    await queryInterface.addIndex("tbl_assessment", ["assessor_id", "assessment_status", "createdAt", "deletedAt"], {
      name: "idx_assessment_assessor_status_created_deleted",
    });

    // ===========================================
    // ACTIVITY TABLE ADDITIONAL INDEXES
    // ===========================================
    
    // Composite index for center_id + user_id + createdAt (for user-specific activity queries)
    await queryInterface.addIndex("tbl_activity", ["center_id", "user_id", "createdAt"], {
      name: "idx_activity_center_user_created",
    });

    // ===========================================
    // USER_QUALIFICATION TABLE ADDITIONAL INDEXES
    // ===========================================
    
    // Composite index for user_id + is_signed_off + deletedAt (for user qualification queries)
    await queryInterface.addIndex("tbl_user_qualification", ["user_id", "is_signed_off", "deletedAt"], {
      name: "idx_user_qualification_user_signed_off_deleted",
    });

    // Composite index for user_id + qualification_id + is_signed_off + deletedAt (for user-specific qualification filtering)
    await queryInterface.addIndex("tbl_user_qualification", ["user_id", "qualification_id", "is_signed_off", "deletedAt"], {
      name: "idx_user_qualification_user_qualification_signed_off_deleted",
    });

    // Composite index for user_id + createdAt + deletedAt (for time-based user qualification queries)
    await queryInterface.addIndex("tbl_user_qualification", ["user_id", "createdAt", "deletedAt"], {
      name: "idx_user_qualification_user_created_deleted",
    });

    console.log("Additional dashboard performance indexes added successfully!");
  },

  async down (queryInterface, Sequelize) {
    console.log("Removing additional dashboard performance indexes...");

    const indexes = [
      // User assessor table indexes
      "idx_user_assessor_assessor_status_deleted",
      "idx_user_assessor_assessor_created_deleted",
      "idx_user_assessor_assessor_status_created_deleted",
      
      // Assessment table additional indexes
      "idx_assessment_assessor_status_deleted",
      "idx_assessment_assessor_created_deleted",
      "idx_assessment_assessor_status_created_deleted",
      
      // Activity table additional indexes
      "idx_activity_center_user_created",
      
      // User qualification table additional indexes
      "idx_user_qualification_user_signed_off_deleted",
      "idx_user_qualification_user_qualification_signed_off_deleted",
      "idx_user_qualification_user_created_deleted"
    ];

    for (const indexName of indexes) {
      try {
        // Determine table name from index name
        let tableName = "";
        if (indexName.includes("user_assessor")) tableName = "tbl_user_assessor";
        else if (indexName.includes("assessment_")) tableName = "tbl_assessment";
        else if (indexName.includes("activity")) tableName = "tbl_activity";
        else if (indexName.includes("user_qualification")) tableName = "tbl_user_qualification";

        await queryInterface.removeIndex(tableName, indexName);
      } catch (error) {
        console.log(`Warning: Could not remove index ${indexName}: ${error.message}`);
      }
    }

    console.log("Additional dashboard performance indexes removed successfully!");
  }
};
