using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HartiCFR_BE.Migrations
{
    /// <inheritdoc />
    public partial class StationLocationToPosition : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Location_end",
                table: "Stations");

            migrationBuilder.DropColumn(
                name: "Location_start",
                table: "Stations");

            migrationBuilder.AddColumn<double>(
                name: "Position_x",
                table: "Stations",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "Position_y",
                table: "Stations",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Position_x",
                table: "Stations");

            migrationBuilder.DropColumn(
                name: "Position_y",
                table: "Stations");

            migrationBuilder.AddColumn<string>(
                name: "Location_end",
                table: "Stations",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Location_start",
                table: "Stations",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}
