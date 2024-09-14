import { DataTypes } from "sequelize";

export default {
  name: "wisdom_questions",
  attribute: {
    id: {
      type: DataTypes.TEXT,
      allowNull: true,
      primaryKey: true,
      unique: true,
    },
    org_id: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    user_id: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sid: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    question_text: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    answer_text: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    result: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reaction: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    token: {
      type: DataTypes.UUID,
    },
    feedback:{
      type: DataTypes.TEXT,
    },
    wisdom_url:{
      type: DataTypes.TEXT,
    },
    createdat: {
      type: DataTypes.DATE,
      allowNull: true,
    },

  },
};
