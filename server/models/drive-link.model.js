import { DataTypes } from "sequelize";

export default {
  name: "drive_link_asset_details",
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
    drive_link: {
      type: DataTypes.TEXT,
      allowNull: true,
      unique: true,
    },
    status: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    group_name: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    uningested_supported_files: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    unsupported_files: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    ingested_files: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
    },
    updatedAt: {
      type: DataTypes.DATE,
    },
    logs: {
      type: DataTypes.JSON,
      allowNull: true,
    }
  },
};
