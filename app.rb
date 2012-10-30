# -*- coding: utf-8 -*-
require 'sinatra'

get '/' do
  erb :index
end

get '/edit' do
  erb :edit
end

post '/create' do
  params[:x]
end
