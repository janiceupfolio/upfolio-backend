Sequelize


-------------------------------------------
                Migration
-------------------------------------------


To create migration and model
-------------------------------------------
sequelize model:generate --name User --attributes firstName:string,lastName:string,email:string


Create new column 
-------------------------------------------
sequelize migration:create --name name_of_your_migration


To run migrations
-----------------------------------------
sequelize db:migrate


To undo migrations
-----------------------------------------
sequelize db:migrate:undo:all


To undo specific migration
-----------------------------------------
sequelize db:migrate:undo --name 20180704124934-create-branch.js
sequelize db:migrate:undo:all --to 20190501100413-create-error-logs



-------------------------------------------
                Seeder
-------------------------------------------


To create seeder
-----------------------------------------
sequelize seed:generate --name demo-user


To seed all data
-----------------------------------------
sequelize db:seed:all



To seed particular file data
-----------------------------------------
sequelize db:seed --seed  name-of-seed-file



To undo all seed data
-----------------------------------------
sequelize db:seed:undo:all



To undo specific seed
-----------------------------------------
sequelize db:seed:undo --seed name-of-seed-file



Disable rebase
-----------------------------------------
git config --global pull.rebase false
git config pull.rebase false
git config --global pull.rebase
git config branch.never.rebase false
git config branch.autoSetupRebase never