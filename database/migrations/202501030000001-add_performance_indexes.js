"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log("Adding performance indexes to improve API response times...");

    // ===========================================
    // USER TABLE INDEXES
    // ===========================================
    
    // Email index for login authentication (most critical)
    await queryInterface.addIndex("tbl_user", ["email"], {
      name: "idx_user_email",
      unique: true,
    });

    // Role index for role-based queries
    await queryInterface.addIndex("tbl_user", ["role"], {
      name: "idx_user_role",
    });

    // Center ID index for center-based filtering
    await queryInterface.addIndex("tbl_user", ["center_id"], {
      name: "idx_user_center_id",
    });

    // Login token index for authentication
    await queryInterface.addIndex("tbl_user", ["login_token"], {
      name: "idx_user_login_token",
    });

    // Composite index for role + center filtering (common in learner listing)
    await queryInterface.addIndex("tbl_user", ["role", "center_id"], {
      name: "idx_user_role_center",
    });

    // Composite index for role + deletedAt (most common query pattern)
    await queryInterface.addIndex("tbl_user", ["role", "deletedAt"], {
      name: "idx_user_role_deleted",
    });

    // ===========================================
    // ASSESSMENT TABLE INDEXES
    // ===========================================
    
    // Assessor ID index for assessor-specific queries
    await queryInterface.addIndex("tbl_assessment", ["assessor_id"], {
      name: "idx_assessment_assessor_id",
    });

    // Center ID index for center-based filtering
    await queryInterface.addIndex("tbl_assessment", ["center_id"], {
      name: "idx_assessment_center_id",
    });

    // Qualification ID index for qualification filtering
    await queryInterface.addIndex("tbl_assessment", ["qualification_id"], {
      name: "idx_assessment_qualification_id",
    });

    // Assessment status index for status-based filtering
    await queryInterface.addIndex("tbl_assessment", ["assessment_status"], {
      name: "idx_assessment_status",
    });

    // Composite index for assessor + status (common query pattern)
    await queryInterface.addIndex("tbl_assessment", ["assessor_id", "assessment_status"], {
      name: "idx_assessment_assessor_status",
    });

    // Composite index for center + status
    await queryInterface.addIndex("tbl_assessment", ["center_id", "assessment_status"], {
      name: "idx_assessment_center_status",
    });

    // Composite index for qualification + status
    await queryInterface.addIndex("tbl_assessment", ["qualification_id", "assessment_status"], {
      name: "idx_assessment_qualification_status",
    });

    // ===========================================
    // ASSESSMENT_LEARNER TABLE INDEXES
    // ===========================================
    
    // Learner ID index for learner-specific queries
    await queryInterface.addIndex("tbl_assessment_learner", ["learner_id"], {
      name: "idx_assessment_learner_learner_id",
    });

    // Assessment ID index for assessment-specific queries
    await queryInterface.addIndex("tbl_assessment_learner", ["assessment_id"], {
      name: "idx_assessment_learner_assessment_id",
    });

    // Composite index for learner + assessment (unique constraint alternative)
    await queryInterface.addIndex("tbl_assessment_learner", ["learner_id", "assessment_id"], {
      name: "idx_assessment_learner_learner_assessment",
    });

    // ===========================================
    // ASSESSMENT_NOTES TABLE INDEXES
    // ===========================================
    
    // Assessment ID index for assessment-specific notes
    await queryInterface.addIndex("tbl_assessment_notes", ["assessment_id"], {
      name: "idx_assessment_notes_assessment_id",
    });

    // User ID index for user-specific notes
    await queryInterface.addIndex("tbl_assessment_notes", ["user_id"], {
      name: "idx_assessment_notes_user_id",
    });

    // Workflow phase index for phase-based filtering
    await queryInterface.addIndex("tbl_assessment_notes", ["workflow_phase"], {
      name: "idx_assessment_notes_workflow_phase",
    });

    // Composite index for assessment + workflow phase (common in learner queries)
    await queryInterface.addIndex("tbl_assessment_notes", ["assessment_id", "workflow_phase"], {
      name: "idx_assessment_notes_assessment_phase",
    });

    // Composite index for assessment + cycle (for ordering)
    await queryInterface.addIndex("tbl_assessment_notes", ["assessment_id", "cycle"], {
      name: "idx_assessment_notes_assessment_cycle",
    });

    // ===========================================
    // USER_QUALIFICATION TABLE INDEXES
    // ===========================================
    
    // User ID index for user-specific qualifications
    await queryInterface.addIndex("tbl_user_qualification", ["user_id"], {
      name: "idx_user_qualification_user_id",
    });

    // Qualification ID index for qualification-specific queries
    await queryInterface.addIndex("tbl_user_qualification", ["qualification_id"], {
      name: "idx_user_qualification_qualification_id",
    });

    // Composite index for user + qualification (unique constraint alternative)
    await queryInterface.addIndex("tbl_user_qualification", ["user_id", "qualification_id"], {
      name: "idx_user_qualification_user_qualification",
    });

    // ===========================================
    // USER_ASSESSOR TABLE INDEXES
    // ===========================================
    
    // User ID index for user-specific assessors
    await queryInterface.addIndex("tbl_user_assessor", ["user_id"], {
      name: "idx_user_assessor_user_id",
    });

    // Assessor ID index for assessor-specific queries
    await queryInterface.addIndex("tbl_user_assessor", ["assessor_id"], {
      name: "idx_user_assessor_assessor_id",
    });

    // Composite index for user + assessor
    await queryInterface.addIndex("tbl_user_assessor", ["user_id", "assessor_id"], {
      name: "idx_user_assessor_user_assessor",
    });

    // ===========================================
    // USER_IQA TABLE INDEXES
    // ===========================================
    
    // User ID index for user-specific IQAs
    await queryInterface.addIndex("tbl_user_iqa", ["user_id"], {
      name: "idx_user_iqa_user_id",
    });

    // IQA ID index for IQA-specific queries
    await queryInterface.addIndex("tbl_user_iqa", ["iqa_id"], {
      name: "idx_user_iqa_iqa_id",
    });

    // Composite index for user + IQA
    await queryInterface.addIndex("tbl_user_iqa", ["user_id", "iqa_id"], {
      name: "idx_user_iqa_user_iqa",
    });

    // ===========================================
    // IMAGES TABLE INDEXES
    // ===========================================
    
    // Entity type index for entity-based filtering
    await queryInterface.addIndex("tbl_image", ["entity_type"], {
      name: "idx_image_entity_type",
    });

    // Entity ID index for entity-specific queries
    await queryInterface.addIndex("tbl_image", ["entity_id"], {
      name: "idx_image_entity_id",
    });

    // Composite index for entity type + ID (most common query pattern)
    await queryInterface.addIndex("tbl_image", ["entity_type", "entity_id"], {
      name: "idx_image_entity_type_id",
    });

    // ===========================================
    // UNITS TABLE INDEXES
    // ===========================================
    
    // Qualification ID index for qualification-specific units
    await queryInterface.addIndex("tbl_units", ["qualification_id"], {
      name: "idx_units_qualification_id",
    });

    // Unit number index for unit number lookups
    await queryInterface.addIndex("tbl_units", ["unit_number"], {
      name: "idx_units_unit_number",
    });

    // Composite index for qualification + deletedAt
    await queryInterface.addIndex("tbl_units", ["qualification_id", "deletedAt"], {
      name: "idx_units_qualification_deleted",
    });

    // ===========================================
    // QUALIFICATIONS TABLE INDEXES
    // ===========================================
    
    // Status index for active/inactive filtering
    await queryInterface.addIndex("tbl_qualifications", ["status"], {
      name: "idx_qualifications_status",
    });

    // Created by index for creator-based queries
    await queryInterface.addIndex("tbl_qualifications", ["created_by"], {
      name: "idx_qualifications_created_by",
    });

    // Composite index for status + deletedAt
    await queryInterface.addIndex("tbl_qualifications", ["status", "deletedAt"], {
      name: "idx_qualifications_status_deleted",
    });

    // ===========================================
    // ASSESSMENT_METHODS TABLE INDEXES
    // ===========================================
    
    // Assessment ID index for assessment-specific methods
    await queryInterface.addIndex("tbl_assessment_methods", ["assessment_id"], {
      name: "idx_assessment_methods_assessment_id",
    });

    // Method ID index for method-specific queries
    await queryInterface.addIndex("tbl_assessment_methods", ["method_id"], {
      name: "idx_assessment_methods_method_id",
    });

    // ===========================================
    // ASSESSMENT_UNITS TABLE INDEXES
    // ===========================================
    
    // Assessment ID index for assessment-specific units
    await queryInterface.addIndex("tbl_assessment_units", ["assessment_id"], {
      name: "idx_assessment_units_assessment_id",
    });

    // Unit ID index for unit-specific queries
    await queryInterface.addIndex("tbl_assessment_units", ["unit_id"], {
      name: "idx_assessment_units_unit_id",
    });

    // ===========================================
    // ASSESSMENT_NOTE_FILES TABLE INDEXES
    // ===========================================
    
    // Assessment note ID index for note-specific files
    await queryInterface.addIndex("tbl_assessment_note_files", ["assessment_note_id"], {
      name: "idx_assessment_note_files_note_id",
    });

    // File ID index for file-specific queries
    await queryInterface.addIndex("tbl_assessment_note_files", ["file_id"], {
      name: "idx_assessment_note_files_file_id",
    });

    // ===========================================
    // METHODS TABLE INDEXES
    // ===========================================
    
    // Status index for active/inactive filtering
    await queryInterface.addIndex("tbl_methods", ["status"], {
      name: "idx_methods_status",
    });

    // Composite index for status + deletedAt
    await queryInterface.addIndex("tbl_methods", ["status", "deletedAt"], {
      name: "idx_methods_status_deleted",
    });

    // ===========================================
    // CENTER TABLE INDEXES
    // ===========================================
    
    // Status index for active/inactive filtering
    await queryInterface.addIndex("tbl_center", ["status"], {
      name: "idx_center_status",
    });

    // Composite index for status + deletedAt
    await queryInterface.addIndex("tbl_center", ["status", "deletedAt"], {
      name: "idx_center_status_deleted",
    });

    console.log("Performance indexes added successfully!");
  },

  async down(queryInterface, Sequelize) {
    console.log("Removing performance indexes...");

    // Remove all indexes in reverse order
    const indexes = [
      // User table indexes
      "idx_user_email", "idx_user_role", "idx_user_center_id", "idx_user_login_token",
      "idx_user_role_center", "idx_user_role_deleted",
      
      // Assessment table indexes
      "idx_assessment_assessor_id", "idx_assessment_center_id", "idx_assessment_qualification_id",
      "idx_assessment_status", "idx_assessment_assessor_status", "idx_assessment_center_status",
      "idx_assessment_qualification_status",
      
      // Assessment learner table indexes
      "idx_assessment_learner_learner_id", "idx_assessment_learner_assessment_id",
      "idx_assessment_learner_learner_assessment",
      
      // Assessment notes table indexes
      "idx_assessment_notes_assessment_id", "idx_assessment_notes_user_id",
      "idx_assessment_notes_workflow_phase", "idx_assessment_notes_assessment_phase",
      "idx_assessment_notes_assessment_cycle",
      
      // User qualification table indexes
      "idx_user_qualification_user_id", "idx_user_qualification_qualification_id",
      "idx_user_qualification_user_qualification",
      
      // User assessor table indexes
      "idx_user_assessor_user_id", "idx_user_assessor_assessor_id",
      "idx_user_assessor_user_assessor",
      
      // User IQA table indexes
      "idx_user_iqa_user_id", "idx_user_iqa_iqa_id", "idx_user_iqa_user_iqa",
      
      // Images table indexes
      "idx_image_entity_type", "idx_image_entity_id", "idx_image_entity_type_id",
      
      // Units table indexes
      "idx_units_qualification_id", "idx_units_unit_number", "idx_units_qualification_deleted",
      
      // Qualifications table indexes
      "idx_qualifications_status", "idx_qualifications_created_by", "idx_qualifications_status_deleted",
      
      // Assessment methods table indexes
      "idx_assessment_methods_assessment_id", "idx_assessment_methods_method_id",
      
      // Assessment units table indexes
      "idx_assessment_units_assessment_id", "idx_assessment_units_unit_id",
      
      // Assessment note files table indexes
      "idx_assessment_note_files_note_id", "idx_assessment_note_files_file_id",
      
      // Methods table indexes
      "idx_methods_status", "idx_methods_status_deleted",
      
      // Center table indexes
      "idx_center_status", "idx_center_status_deleted"
    ];

    for (const indexName of indexes) {
      try {
        // Determine table name from index name
        let tableName = "";
        if (indexName.includes("user_")) tableName = "tbl_user";
        else if (indexName.includes("assessment_")) {
          if (indexName.includes("learner")) tableName = "tbl_assessment_learner";
          else if (indexName.includes("notes")) tableName = "tbl_assessment_notes";
          else if (indexName.includes("methods")) tableName = "tbl_assessment_methods";
          else if (indexName.includes("units")) tableName = "tbl_assessment_units";
          else if (indexName.includes("note_files")) tableName = "tbl_assessment_note_files";
          else tableName = "tbl_assessment";
        }
        else if (indexName.includes("qualification")) tableName = "tbl_user_qualification";
        else if (indexName.includes("assessor")) tableName = "tbl_user_assessor";
        else if (indexName.includes("iqa")) tableName = "tbl_user_iqa";
        else if (indexName.includes("image")) tableName = "tbl_image";
        else if (indexName.includes("units")) tableName = "tbl_units";
        else if (indexName.includes("qualifications")) tableName = "tbl_qualifications";
        else if (indexName.includes("methods")) tableName = "tbl_methods";
        else if (indexName.includes("center")) tableName = "tbl_center";

        await queryInterface.removeIndex(tableName, indexName);
      } catch (error) {
        console.log(`Warning: Could not remove index ${indexName}: ${error.message}`);
      }
    }

    console.log("Performance indexes removed successfully!");
  },
};
