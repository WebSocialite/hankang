import { registerEnumType } from '@nestjs/graphql';

export enum ProductType {
	DIGITAL = 'DIGITAL',
	CLOTHES = 'CLOTHES',
	FOOD = 'FOOD',
}
registerEnumType(ProductType, {
	name: 'ProductType',
});

export enum ProductStatus {
	ACTIVE = 'ACTIVE',
	SOLD = 'SOLD',
	DELETE = 'DELETE',
}
registerEnumType(ProductStatus, {
	name: 'ProductStatus',
});
