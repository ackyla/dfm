require 'sinatra'

get '/' do
  erb :index
end

get '/edit' do
  erb :edit
end
