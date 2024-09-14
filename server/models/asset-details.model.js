import { DataTypes } from "sequelize";

export default {
  name: "asset_details",
  attribute: {
    id: {
      type: DataTypes.UUID,
      allowNull: true,
      primaryKey: true,
      unique: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    user_name: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    category: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    task_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
    },
    deleted_by:{
      type: DataTypes.TEXT,
    },
    doc_id: {
      type: DataTypes.TEXT,
    },
  },
};
